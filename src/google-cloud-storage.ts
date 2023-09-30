import { Storage } from "@google-cloud/storage";

//update bucket cors:
//gcloud storage buckets update gs://howler-event-images --cors-file=howler-event-images-cors.json

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

export async function generateV4UploadSignedUrl(fileName: string) {
  // These options will allow temporary uploading of the file with outgoing
  // Content-Type: application/octet-stream header.

  // Get a v4 signed URL for uploading file
  const [signedUrlPng] = await bucketEventImages.file(fileName).getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    //contentType: "application/octet-stream",
    //contentType: "image/jpeg",
    contentType: "image/png",
    //extensionHeaders: { "content-length": 10 * ONE_MB_IN_BYTES },
  });

  const [signedUrlJpeg] = await bucketEventImages.file(fileName).getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    //contentType: "application/octet-stream",
    //contentType: "image/jpeg",
    contentType: "image/jpeg",
    //extensionHeaders: { "content-length": 10 * ONE_MB_IN_BYTES },
  });

  /*
    console.log('Generated PUT signed URL:');
    console.log(url);
    console.log('You can use this URL with any user agent, for example:');
    console.log(
      "curl -X PUT -H 'Content-Type: application/octet-stream' " +
        `--upload-file my-file '${url}'`
    );
    */

  return { signedUrlPng, signedUrlJpeg };
}

export async function getBucketMetadata() {
  const [metadata] = await bucketEventImages.getMetadata();
  console.log(JSON.stringify(metadata, null, 2));
  //return metadata;
}
