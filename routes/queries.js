let { bls12_381: bls } = require('@noble/curves/bls12-381');
let crypto = require("crypto");
let fs = require("fs")
let path = require("path")
module.exports = async function (fastify, opts) {
    fastify.post("/query", async (req, reply) => {
        if (!req.body || !req.body.type || !req.body.input) {
            return { error: "Invalid type or input" }
        }
        if (fs.existsSync(path.join(__dirname, "..", "queries", req.body.type + ".js"))) {
            let result = await (require(path.join(__dirname, "..", "queries", req.body.type + ".js")))(req.body.input).catch(error => {
                console.error("[QUERY ERROR] (" + req.body.type + ")", req.body.input, error)
            })
            return { result, signer: config.pubkey, signature: Buffer.from(bls.sign(Buffer.from(JSON.stringify(result)), Buffer.from(config.privkey, "base64url"))).toString("base64url"), sequence: state.sequence, time: Date.now() }
        } else {
            return { error: "Invalid type" }
        }
    })

}