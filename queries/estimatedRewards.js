module.exports = async (input) => {
    if (!currentPowerSet.find(senatorpk => senatorpk.toString("base64url") == input)) {
        throw new Error("Provided address not belongs to an active senator")
    }
    let elapsedTime = Math.round(Object.values(state.clock).reduce((pv, cv) => pv + cv, 0) / Object.values(state.clock).length) - state.senators[input].lastRewardsClaim

    return { estimatedRewards: (100n * BigInt(Math.floor(elapsedTime / 100000))).toString() }
}