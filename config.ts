// export const appConfig = {
//     appId: process.env.NEXT_PUBLIC_APPID || "",
//     channel: process.env.NEXT_PUBLIC_CHANNEL || "",
//     token: process.env.NEXT_PUBLIC_TOKEN || "",
//   };


// server side
export const appConfig = {
  appId: process.env.APPID || "",
  cert: process.env.APP_CERTIFICATE || "",
  channel: process.env.CHANNEL || "",
  streamUid: process.env.STREAM_UID || "",
  agoraAuth: process.env.AGORA_AUTH || "",
  secretKey: process.env.SECRET_KEY || "",
  accessKey: process.env.ACCESS_KEY || "",
  bucket: process.env.BUCKET || "",
};