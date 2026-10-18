import { Writable } from "stream";
import express from "express";
import multer from "multer";
import request from "supertest";
import { CloudinaryStorage } from "../config/cloudinary";

/** A stand-in for cloudinary.uploader: collects the bytes, answers like the SDK */
const fakeCloudinary = (fail = false) => {
  const uploads: { params: unknown; bytes: number }[] = [];
  const destroyed: string[] = [];
  const uploader = {
    upload_stream: (params: unknown, cb: (error?: unknown, result?: unknown) => void) => {
      let bytes = 0;
      return new Writable({
        write(chunk, _enc, next) {
          bytes += chunk.length;
          next();
        },
        final(next) {
          uploads.push({ params, bytes });
          if (fail) cb({ message: "Invalid image file", http_code: 400 });
          else
            cb(undefined, {
              secure_url: `https://res.cloudinary.com/demo/image/upload/v1/shop/photo-${uploads.length}.jpg`,
              public_id: `shop/photo-${uploads.length}`,
              bytes,
            });
          next();
        },
      });
    },
    destroy: async (publicId: string) => {
      destroyed.push(publicId);
      return { result: "ok" };
    },
  };
  return { cloudinary: { uploader } as any, uploads, destroyed };
};

const appWith = (fake: ReturnType<typeof fakeCloudinary>, limits?: multer.Options["limits"]) => {
  const upload = multer({
    storage: new CloudinaryStorage({ cloudinary: fake.cloudinary, params: { folder: "shop" } }),
    limits,
  });
  const app = express();
  app.post("/upload", upload.array("images", 3), (req, res) => {
    const files = (req.files as Express.Multer.File[]).map((f) => ({ url: f.path, publicId: f.filename, size: f.size }));
    res.json({ files });
  });
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(400).json({ code: err.code, message: err.message });
  });
  return app;
};

const image = (size: number) => Buffer.alloc(size, 7);

describe("CloudinaryStorage (multer → Cloudinary upload stream)", () => {
  it("gives each file its hosted URL as path and its public id as filename", async () => {
    const fake = fakeCloudinary();
    const res = await request(appWith(fake))
      .post("/upload")
      .attach("images", image(1500), { filename: "a.jpg", contentType: "image/jpeg" })
      .attach("images", image(800), { filename: "b.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(200);
    expect(res.body.files).toEqual([
      { url: "https://res.cloudinary.com/demo/image/upload/v1/shop/photo-1.jpg", publicId: "shop/photo-1", size: 1500 },
      { url: "https://res.cloudinary.com/demo/image/upload/v1/shop/photo-2.jpg", publicId: "shop/photo-2", size: 800 },
    ]);
    expect(fake.uploads.map((u) => u.params)).toEqual([{ folder: "shop" }, { folder: "shop" }]);
  });

  it("passes Cloudinary's refusal on as the request's error", async () => {
    const fake = fakeCloudinary(true);
    const res = await request(appWith(fake))
      .post("/upload")
      .attach("images", image(100), { filename: "a.jpg", contentType: "image/jpeg" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid image file");
  });

  it("removes photos already uploaded when a later file is too large", async () => {
    const fake = fakeCloudinary();
    const res = await request(appWith(fake, { fileSize: 1000 }))
      .post("/upload")
      .attach("images", image(500), { filename: "small.jpg", contentType: "image/jpeg" })
      .attach("images", image(5000), { filename: "big.jpg", contentType: "image/jpeg" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("LIMIT_FILE_SIZE");
    expect(fake.destroyed).toContain("shop/photo-1");
  });
});
