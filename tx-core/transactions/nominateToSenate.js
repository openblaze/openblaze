module.exports = async (tx) => {
    if (!tx.input || !tx.input.name || !tx.input.description || !tx.input.pubkey || !tx.input.links || !tx.input.contacts) {
        throw new Error("Not enough info")
    }
    console.log(tx.input.name)
}