import { Storage } from "@google-cloud/storage";

//update bucket cors:
//gcloud storage buckets update gs://howler-event-images --cors-file=howler-event-images-cors.json

/*
notes to self:

regarding setting cache / max-age on uploaded objects
add Cache-Control to responseHeader list in cors.json
see: https://stackoverflow.com/a/55597471/7420810

regarding max size of upload:
requiring the specific header "X-Goog-Content-Length-Range": "0,1000000" on PUT requests
makes google check actual size of uploaded obhect and reject if too large.
see other special headers here: https://cloud.google.com/storage/docs/json_api/v1/parameters#xgoogcontentlengthrange

SUMMARY:
cors.json:
[{
  "origin": ["http://localhost:3000"],
  "method": ["PUT"],
  "responseHeader": [
    "Content-Type",
    "Cache-Control",
    "X-Goog-Content-Length-Range"
  ],
  "maxAgeSeconds": 3600
},
{
  "origin": ["*"],
  "method": ["GET"],
  "responseHeader": ["Content-Type", "Cache-Control"],
  "maxAgeSeconds": 2592000
}]

client-side js:
const res = await fetch(gcs.signedUploadUrl, {
  method: "PUT",
  headers: {
    "Content-Type": file.type,
    "Cache-Control": "public, max-age=2592000",
    "X-Goog-Content-Length-Range": "0,10000000",
  },
  body: file,
});
  
*/

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
      //extensionHeaders: { "X-Goog-Content-Length-Range": "0,1000000" }, // 1MB
      extensionHeaders: { "X-Goog-Content-Length-Range": "0,10000000" }, //10MB
    });

  const imageUrl = `https://storage.googleapis.com/howler-event-images/${fileName}`;

  return { signedUploadUrl, imageUrl };
}

export async function getBucketMetadata() {
  const [metadata] = await bucketEventImages.getMetadata();
  return JSON.stringify(metadata, null, 2);
}
