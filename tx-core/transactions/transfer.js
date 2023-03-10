module.exports = async (tx) => {
    if (!tx.input || !tx.input.reciever || !tx.input.denom || !tx.input.amount) {
        throw new Error("Not enough info")
    }

    // User doesnt have any tokens
    if(!state.balances[tx.signer]) {
        throw new Error("Cant transfer without balance")
    }

    // Trying to send more than has
    if(BigInt(state.balances[tx.signer][tx.input.denom].amount) < BigInt(tx.input.amount)) {
        throw new Error(`${tx.input.amount} is more than balance (${state.balances[tx.signer][tx.input.denom].amount})`)
    }

    // Remove balance
    state.balances[tx.signer][tx.input.denom].amount = (BigInt(state.balances[tx.signer][tx.input.denom].amount) - BigInt(tx.input.amount)).toString()

    // If the wallet doesnt exist create it
    if(!state.balances[tx.input.reciever]) {
        state.balances[tx.input.reciever] = {}
        state.balances[tx.input.reciever][tx.input.denom] = {
            amount: "0"
        }
    }

    // add the amount to the balance
    state.balances[tx.input.reciever][tx.input.denom].amount = (BigInt(state.balances[tx.input.reciever][tx.input.denom].amount) + BigInt(tx.input.amount)).toString()
}