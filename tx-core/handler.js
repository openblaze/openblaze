let crypto = require("crypto");
let path = require("path")
let fs = require('fs')
module.exports = async (tx) => {
    let txId = crypto.createHash("sha256").update(JSON.stringify({ input: tx.input, type: tx.type, anchoredTxId: tx.anchoredTxId, expires: tx.expires, signature: tx.signature })).digest("base64url")
    tx.id = txId
    
    state.balances[tx.signer][state.params.denom] = { amount: (BigInt(state.balances[tx.signer][state.params.denom]?.amount || "0") - BigInt(state.params.gas[tx.type] || "0")).toString() }
  
    let senateRecieves = BigInt(state.params.gas[tx.type] || "0") / BigInt(tx.senateSignatures.length)

    for (let signature of tx.senateSignatures) {
        if (!state.balances[signature.signer]) {
            state.balances[signature.signer] = {}
            state.balances[signature.signer][state.params.denom] = {
                amount: "0"
            }
        }

        state.balances[signature.signer][state.params.denom].amount = (BigInt(state.balances[signature.signer][state.params.denom]?.amount || "0") + senateRecieves).toString()
    }

    if (state.processedTransactions.includes(txId)) { return { error: "Already processed" } }
    state.sequence++
    state.processedTransactions.push(txId)
    state.lastTxIds[tx.signer] = txId
    if (fs.existsSync(path.join(__dirname, "transactions", tx.type + ".js"))) {
        await (require(path.join(__dirname, "transactions", tx.type + ".js")))(tx).catch(error => {
            console.error("[TX EXECUTION ERROR] (" + txId + ")", error)
        })
    }
    needToWrite.add("state")
    return { ok: true }
}