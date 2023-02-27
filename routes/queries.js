let { bls12_381: bls } = require('@noble/curves/bls12-381');
let crypto = require("crypto");
let fs = require("fs")
let path = require("path")
let { fetch } = require("undici")
module.exports = async function (fastify, opts) {
    fastify.post("/query", async (req, reply) => {
        if (!req.body || !req.body.type || !req.body.input) {
            return { error: "Invalid type or input" }
        }
        if (fs.existsSync(path.join(__dirname, "..", "queries", req.body.type + ".js"))) {
            let result = await (require(path.join(__dirname, "..", "queries", req.body.type + ".js")))(req.body.input).catch(error => {
                console.error("[QUERY ERROR] (" + req.body.type + ")", req.body.input, error)
            })
            return {
                result,
                signer: config.pubkey,
                signature: Buffer.from(bls.sign(Buffer.from(JSON.stringify(result)),
                    Buffer.from(config.privkey, "base64url"))).toString("base64url"),
                sequence: state.sequence,
                time: Date.now(),

            }
        } else {
            return { error: "Invalid type" }
        }
    })
    fastify.post("/provedQuery", (req) => {
        return new Promise(async (reply) => {
            if (!req.body || !req.body.type || !req.body.input) {
                return { error: "Invalid type or input" }
            }
            let threshold = Math.floor(currentPowerSet.length / 2) + 1
            let replies = []
            let replied = false
            peers.forEach(async peer => {
                if (replied) { return }
                let queryReply = await fetch(`http://` + peer + "/query", { method: "POST", body: JSON.stringify(req.body), headers: { "Content-Type": "application/json" } }).then(res => res.json()).catch(e => null)
                addQueryReply(queryReply)
            })

            async function addQueryReply(queryReply) {
                if (!queryReply || typeof queryReply.result != "object" || typeof queryReply.signer != "string" || typeof queryReply.signature != "string" || typeof queryReply.sequence != "number" || typeof queryReply.time != "number") { return }
                if (!currentPowerSet.find(senatorpub => senatorpub.toString("base64url") == queryReply.signer)) { return }
                if (!bls.verify(Buffer.from(queryReply.signature, 'base64'), Buffer.from(JSON.stringify(queryReply.result)), Buffer.from(queryReply.signer, "base64"))) {
                    return
                }
                queryReply.hash = crypto.createHash("sha256").update(Buffer.from(JSON.stringify(queryReply.result))).digest("base64url")
                replies.push(queryReply)
                let mostVoted = groupByKey(replies, "hash").find(variant => variant.length >= threshold)
                if (mostVoted && !replied) {
                    replied = true
                    reply({
                        result: mostVoted[0].result,
                        signers: mostVoted.map(v => v.signer),
                        signature: Buffer.from(bls.aggregateSignatures(
                            mostVoted.map(v => Buffer.from(v.signature, "base64"))
                        )).toString("base64url"),
                        time: mostVoted.reduce((pv, cv) => pv + cv.time, 0) / mostVoted.length
                    })
                }

            }
            setTimeout(() => {
                if (!replied) {
                    reply({ error: "Consensus wasn't reached" })
                }
            }, 3000)
        })


    })

}
const groupByKey = (list, key) => Object.values(list.reduce((hash, obj) => ({ ...hash, [obj[key]]: (hash[obj[key]] || []).concat(obj) }), {}))