let { bls12_381: bls } = require('@noble/curves/bls12-381');
let crypto = require("crypto");

let { fetch } = require("undici")
let txHandler = require("../tx-core/handler")
module.exports = async function (fastify, opts) {
    fastify.post("/broadcastTx", async (request, reply) => {
        let threshold = Math.floor(currentPowerSet.length / 2) + 1

        let allowanceTime = Date.now() + 30000
        let txBody = request.body
        if (
            !txBody
            || typeof txBody !== "object"
            || !Array.isArray(txBody.senateSignatures)
            || typeof txBody.anchoredTxId == "undefined"
            || typeof txBody.signer != "string"
            || typeof txBody.type != "string"
            || typeof txBody.expires != "number"
            || typeof txBody.input != 'object'
            || typeof txBody.signature != "string"
        ) {
            return { error: "Invalid tx body" }
        }

        let txHash = crypto.createHash("sha256").update(JSON.stringify({ input: txBody.input, type: txBody.type, anchoredTxId: txBody.anchoredTxId, expires: txBody.expires, signature: txBody.signature })).digest("base64url")
        if (anchorLocks.get(txBody.anchoredTxId)?.expiryTime > Date.now() && anchorLocks.get(txBody.anchoredTxId)?.txHash != txHash) { return { error: "Another tx achored to this anchor is in processing right now" } }
        if (txBody.expires < Date.now()) { return { error: "Tx expired" } }
        if (txBody.anchoredTxId != (state.lastTxIds[txBody.signer] || txBody.signer)) {
            return { error: "Invalid anchor" }
        }

        let dataForAccountSign = Buffer.from(JSON.stringify({ input: txBody.input, type: txBody.type, anchoredTxId: txBody.anchoredTxId, expires: txBody.expires }))
        if (!bls.verify(Buffer.from(txBody.signature, "base64"), dataForAccountSign, Buffer.from(txBody.signer, "base64"))) { return { error: "Signature verification failed" } }

        if (!state.balances[txBody.signer] && BigInt(state.params.gas[txBody.type]) > 0n) {
            return { error: "Unable to afford gas" }
        }

        if (BigInt(state.balances[txBody.signer]?.amount || "0") < BigInt(state.params.gas[txBody.type])) {
            return { error: `${state.params.gas[txBody.type]} is more than balance (${state.balances[txBody.signer].amount})` }
        }

        txBody.senateSignatures = txBody.senateSignatures.filter((item,
            index) => txBody.senateSignatures.findIndex(i => i.signer == item.signer) === index).filter(sigObj => {

                if (typeof sigObj.signer != "string" || typeof sigObj.signature != "string" || typeof sigObj.expires != "number") { return false }
                if (sigObj.expires < Date.now()) { return false }
                if (!currentPowerSet.find(senatorpub => senatorpub.toString("base64url") == sigObj.signer)) { return false }
                if (!bls.verify(Buffer.from(sigObj.signature, "base64"), Buffer.from(JSON.stringify({ input: txBody.input, type: txBody.type, anchoredTxId: txBody.anchoredTxId, expires: txBody.expires, signature: txBody.signature, senatorSigExpires: sigObj.expires })), Buffer.from(sigObj.signer, "base64"))) { return false }
                return true
            })

        if (txBody.senateSignatures.length >= threshold) {

            txHandler(txBody)

        }
        if (txBody.senateSignatures.find(sigObj => sigObj.signer == config.pubkey)) { return { error: "This node already signed this tx" } }

        let currentNodeSignature = Buffer.from(
            bls.sign(
                Buffer.from(JSON.stringify({ input: txBody.input, type: txBody.type, anchoredTxId: txBody.anchoredTxId, expires: txBody.expires, signature: txBody.signature, senatorSigExpires: allowanceTime })),
                Buffer.from(config.privkey, "base64url")
            )
        ).toString("base64")

        txBody.senateSignatures.push({
            expires: allowanceTime,
            signature: currentNodeSignature,
            signer: config.pubkey
        })

        anchorLocks.set(txBody.anchoredTxId, { expiryTime: allowanceTime + 5000, txHash })

        peers.forEach(async peer => {
            fetch('http://' + peer + "/broadcastTx", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(txBody)
            }).then(res => res.json()).catch(e => console.error("Error delivering tx to peer " + peer))
        })

        return { ok: true, txHash }
    })
    fastify.get("/lastTxId/:account", async (request, reply) => {

        return state.lastTxIds[request.params.account] || request.params.account
    })
}