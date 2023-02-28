let { bls12_381: bls } = require('@noble/curves/bls12-381');
let crypto = require("crypto");


module.exports = async function (fastify, opts) {

    fastify.get("/state", async (request, reply) => {
        return JSON.stringify(state)
    })
    fastify.get("/stateSignature", async (request, reply) => {
        let expires = Date.now() + 30000
        let stateHash = crypto.createHash("sha256").update(JSON.stringify(state)).digest()
        let signature = Buffer.from(bls.sign(Buffer.from(stateHash.toString("base64") + ";" + expires + ";" + state.sequence), Buffer.from(config.privkey, "base64")))
        return { stateHash: stateHash.toString("base64"), signature: signature.toString("base64"), signer: config.pubkey, expires, sequence: state.sequence }
    })


}
