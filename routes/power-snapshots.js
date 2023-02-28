let { bls12_381: bls } = require('@noble/curves/bls12-381');
let crypto = require("crypto");

module.exports = async function (fastify, opts) {

    fastify.get("/snapshotsSince/:trustedSnapshotSignature", async (request, reply) => {
        let requestedPowerIndex = powerSnapshots.findIndex(snapshot => crypto.createHash("sha256").update(snapshot.split(":")[0].split(";")[0]).digest("base64url") == request.params.trustedSnapshotSignature)
        if (requestedPowerIndex < 0) {
            reply.status(404)
            return { error: "Requested trusted snapshot isn't available to this node" }
        }
        return { snapshots: powerSnapshots.slice(requestedPowerIndex + 1) }
    })
    fastify.get("/signatureForNextSnapshot", async (request, reply) => {

        return { signer: config.pubkey, signature: Buffer.from(bls.sign(Buffer.from(Object.keys(state.senators).join(",")), Buffer.from(config.privkey, "base64url"))).toString("base64") }
    })
}