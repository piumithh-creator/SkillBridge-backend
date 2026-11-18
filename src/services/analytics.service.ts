import { User } from "../models/User";
import { Internship } from "../models/Internship";
import { Application } from "../models/Application";
import { APPLICATION_STATUSES, INTERNSHIP_STATUSES, ROLES } from "../constants";

const countBy = async (model: typeof User | typeof Internship | typeof Application, field: string) => {
  const rows = await (model as typeof User).aggregate<{ _id: string; count: number }>([{ $group: { _id: `$${field}`, count: { $sum: 1 } } }]);
  return Object.fromEntries(rows.map((r) => [r._id, r.count]));
};

export const getPlatformStats = async () => {
  const [byRole, blocked, byInternship, byApp] = await Promise.all([
    countBy(User, "role"),
    User.countDocuments({ isBlocked: true }),
    countBy(Internship, "status"),
    countBy(Application, "status")
  ]);
  const fill = <K extends string>(keys: readonly K[], src: Record<string, number>): Record<K, number> =>
    Object.fromEntries(keys.map((k) => [k, src[k] ?? 0])) as Record<K, number>;
  const roles = fill(ROLES, byRole);
  const internships = fill(INTERNSHIP_STATUSES, byInternship);
  const applications = fill(APPLICATION_STATUSES, byApp);
  const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
  return {
    users: { total: sum(roles), students: roles.STUDENT, companies: roles.COMPANY, admins: roles.ADMIN, blocked },
    internships: { total: sum(internships), ...internships },
    applications: { total: sum(applications), byStatus: applications }
  };
};

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

const dailySeries = async (model: typeof User | typeof Application, days: number) => {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));
  const rows = await (model as typeof User).aggregate<{ _id: string; count: number }>([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }
  ]);
  const map = new Map(rows.map((r) => [r._id, r.count]));
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    return { date: dayKey(d), count: map.get(dayKey(d)) ?? 0 };
  });
};

export const getAnalytics = async () => {
  const [applicationsOverTime, registrationsOverTime, internshipsByCategory, topSkills, topInternships, stats] = await Promise.all([
    dailySeries(Application, 30),
    dailySeries(User, 30),
    Internship.aggregate<{ _id: string; count: number }>([
      { $match: { status: "PUBLISHED" } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    Internship.aggregate<{ _id: string; count: number }>([
      { $unwind: "$requiredSkills" },
      { $group: { _id: { $toLower: "$requiredSkills" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]),
    Application.aggregate<{ _id: string; title: string; count: number }>([
      { $group: { _id: "$internship", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $lookup: { from: "internships", localField: "_id", foreignField: "_id", as: "i" } },
      { $project: { title: { $ifNull: [{ $arrayElemAt: ["$i.title", 0] }, "(deleted)"] }, count: 1 } }
    ]),
    getPlatformStats()
  ]);

  return {
    applicationsOverTime,
    registrationsOverTime,
    applicationStatusDistribution: Object.entries(stats.applications.byStatus).map(([name, value]) => ({ name, value })),
    usersByRole: [
      { name: "STUDENT", value: stats.users.students },
      { name: "COMPANY", value: stats.users.companies },
      { name: "ADMIN", value: stats.users.admins }
    ],
    internshipsByCategory: internshipsByCategory.map((r) => ({ name: r._id, value: r.count })),
    topSkills: topSkills.map((r) => ({ name: r._id, value: r.count })),
    topInternships: topInternships.map((r) => ({ name: r.title, value: r.count }))
  };
};
