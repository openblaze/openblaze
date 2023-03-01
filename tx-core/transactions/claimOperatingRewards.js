module.exports = async (tx) => {
    if (!tx.input || typeof tx.input.time != "number") {
        throw new Error("Not enough info")
    }
    if (!currentPowerSet.find(senatorpk => senatorpk.toString("base64url") == tx.signer)) {
        throw new Error("Signer is not senator")
    }
    if (Math.abs(tx.input.time - Math.round(Object.values(state.clock).reduce((pv, cv) => pv + cv, 0) / Object.values(state.clock).length)) > 120000) {
        throw new Error("Clock is out of sync")
    }
    let elapsedTime = tx.input.time - state.senators[tx.signer].lastRewardsClaim
    if (elapsedTime < 1.8e+6) {
        throw new Error("Can claim operating rewards only once every 30 minutes")
    }
    
    let rewards = 100n * BigInt(Math.floor(elapsedTime / 100000)) //100s is put specially to incentivize rare reward claim and disincentivize reward claim spam (if senator claims once per 30m, part of rewards gets lost due to rounding, the more time the less rounding impact)
    state.balances[tx.signer][state.params.denom].amount = (BigInt(Math.floor(state.balances[tx.signer][state.params.denom].amount)) + rewards).toString()

    state.senators[tx.signer].lastRewardsClaim = tx.input.time
}