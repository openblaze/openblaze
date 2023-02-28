let { bls12_381: bls } = require('@noble/curves/bls12-381');
let { fetch } = require("undici")
module.exports = async () => {
    let anchoredTxId = state.lastTxIds[config.pubkey] || config.pubkey
    let expires = Date.now() + 40000;
    let input = { time: Date.now() }
    await fetch('http://' + config.nodeAddress + '/broadcastTx', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            senateSignatures: [],
            anchoredTxId,
            signer: config.pubkey,
            type: "voteForTime",
            expires,
            input,
            signature: Buffer.from(bls.sign(Buffer.from(JSON.stringify({ input, type: "voteForTime", anchoredTxId, expires })), Buffer.from(config.privkey, "base64"))).toString("base64url")

        })
    }).then(res => res.json())
    console.log("[CLOCK] Voted for " + new Date(input.time).toISOString())
}