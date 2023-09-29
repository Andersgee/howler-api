import { Storage } from "@google-cloud/storage";

// Creates a client
//const storage = new Storage();
//const storage = new Storage({ keyFilename: "key.json" });
const storage = new Storage({ keyFilename: "andyfx-service-account-key.json" });

const BUCKET_NAME = "howler-event-images";

//https://cloud.google.com/storage/docs/access-control/signing-urls-with-helpers#client-libraries_1

//TODO: check if setting "content-length" is enough to limit file size
//else check this: https://blog.koliseo.com/limit-the-size-of-uploaded-files-with-signed-urls-on-google-cloud-storage/

const ONE_MB_IN_BYTES = 1000000;

export async function generateV4UploadSignedUrl(fileName: string) {
  // These options will allow temporary uploading of the file with outgoing
  // Content-Type: application/octet-stream header.

  // Get a v4 signed URL for uploading file
  const [url] = await storage
    .bucket(BUCKET_NAME)
    .file(fileName)
    .getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: "application/octet-stream",
      //extensionHeaders: { "content-length": 1 * ONE_MB_IN_BYTES },
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

  return url;
}

export async function getBucketMetadata() {
  const [metadata] = await storage.bucket(BUCKET_NAME).getMetadata();
  console.log(JSON.stringify(metadata, null, 2));
  //return metadata;
}
