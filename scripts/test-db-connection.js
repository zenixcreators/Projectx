const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (dnsErr) {
  console.warn("Could not set public DNS resolvers:", dnsErr.message);
}

const mongoose = require('mongoose');

async function test() {
  const uris = [
    "mongodb+srv://creatoros:creatoros@cluster0.bb4kfne.mongodb.net/nexus?appName=Cluster0",
    "mongodb+srv://creatoros:creatoros@cluster0.bb4kfne.mongodb.net/test?appName=Cluster0",
    "mongodb+srv://creatoros:creatoros@cluster0.bb4kfne.mongodb.net/creatoros?appName=Cluster0",
    "mongodb+srv://creatoros:creatoros@cluster0.bb4kfne.mongodb.net/?appName=Cluster0"
  ];

  for (const uri of uris) {
    console.log(`Trying: ${uri}`);
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log(`SUCCESS! Connected to: ${uri}`);
      await mongoose.disconnect();
      return;
    } catch (err) {
      console.error(`FAILED: ${err.message}`);
    }
  }
  console.log("All connection attempts failed.");
}

test();
