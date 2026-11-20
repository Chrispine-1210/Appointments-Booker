import { createApp } from "../server/app";
const { server, storage } = await createApp();
server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing worker address");
  process.send?.({ port: address.port });
});
process.on("message", message => {
  if (message === "stop") {
    server.closeAllConnections();
    server.close(() => { void storage.close().then(() => process.exit(0)); });
  }
});
