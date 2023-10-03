import { Storage } from "@google-cloud/storage";

//update bucket cors:
//gcloud storage buckets update gs://howler-event-images --cors-file=howler-event-images-cors.json

//perhaps consider smaller less cache time... for updating images, or just create a new and delete old one?
//https://cloud.google.com/storage/docs/caching#performance_considerations

// Creates a client
//const storage = new Storage({ keyFilename: "andyfx-service-account-key.json" });

const storage = new Storage({
  projectId: process.env.GOOGLE_ANDYFX_SERVICE_ACCOUNT_PROJECT_ID,
  credentials: {
    client_email: process.env.GOOGLE_ANDYFX_SERVICE_ACCOUNT_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_ANDYFX_SERVICE_ACCOUNT_PRIVATE_KEY,
  },
});

const bucketEventImages = storage.bucket("howler-event-images");

//https://cloud.google.com/storage/docs/access-control/signing-urls-with-helpers#client-libraries_1

//TODO: check if setting "content-length" is enough to limit file size
//else check this: https://blog.koliseo.com/limit-the-size-of-uploaded-files-with-signed-urls-on-google-cloud-storage/

//also about setting max-age, see: https://stackoverflow.com/a/55597471/7420810

export async function generateV4UploadSignedUrl(
  fileName: string,
  contentType: string
) {
  const [signedUploadUrl] = await bucketEventImages
    .file(fileName)
    .getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: contentType,
      //extensionHeaders: { "content-length": 10 * ONE_MB_IN_BYTES },
    });

  /*
  const [signedUrlPng] = await bucketEventImages.file(fileName).getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    contentType: "image/png",
    //extensionHeaders: { "content-length": 10 * ONE_MB_IN_BYTES },
  });

  const [signedUrlJpeg] = await bucketEventImages.file(fileName).getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    contentType: "image/jpeg",
    //extensionHeaders: { "content-length": 10 * ONE_MB_IN_BYTES },
  });
  */

  const imageUrl = `https://storage.googleapis.com/howler-event-images/${fileName}`;

  return { signedUploadUrl, imageUrl };
}

export async function getBucketMetadata() {
  const [metadata] = await bucketEventImages.getMetadata();
  return JSON.stringify(metadata, null, 2);
}
