const startsWith = (buf: Buffer, bytes: number[]) => bytes.every((b, i) => buf[i] === b);

export const isPdf = (buf: Buffer): boolean => buf.length > 4 && buf.subarray(0, 5).toString("latin1") === "%PDF-";
export const isPng = (buf: Buffer): boolean => startsWith(buf, [0x89, 0x50, 0x4e, 0x47]);
export const isJpeg = (buf: Buffer): boolean => startsWith(buf, [0xff, 0xd8, 0xff]);
export const isImage = (buf: Buffer): boolean => isPng(buf) || isJpeg(buf);
