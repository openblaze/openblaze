let crypto = require("crypto");
let path = require("path")
let fs = require('fs')
module.exports = async (tx) => {
    state.sequence++
    state.lastTxIds[tx.signer] = crypto.createHash("sha256").update(JSON.stringify({ input: tx.input, type: tx.type, anchoredTxId: tx.anchoredTxId, expires: tx.expires, signature: tx.signature })).digest("base64url")
    if (fs.existsSync(path.join(__dirname, "transactions", tx.type + ".js"))) {
        await (require(path.join(__dirname, "transactions", tx.type + ".js")))(tx)
    }
    needToWrite.add("state")
    return { ok: true }
}