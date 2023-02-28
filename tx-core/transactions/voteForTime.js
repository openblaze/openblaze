module.exports = async (tx) => {

    if (!tx.input || typeof tx.input.time != "number") {
        throw new Error("Not enough info")
    }

    if (!currentPowerSet.find(senatorpk => senatorpk.toString("base64url") == tx.signer)) {
        throw new Error("Signer is not senator")
    }

    state.clock[tx.signer] = tx.input.time
}