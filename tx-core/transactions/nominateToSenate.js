module.exports = async (tx) => {
    if (!tx.input || !tx.input.name || !tx.input.description || !tx.input.pubkey || !tx.input.links || !tx.input.contacts) {
        console.log("Not enough info")
        throw new Error("Not enough info")
    }
    state.senateCandidates[tx.input.pubkey] = { name: tx.input.name, description: tx.input.description, pubkey: tx.input.pubkey, links: tx.input.links, contacts: tx.input.contacts, votes: [] }
    console.log(tx.input.name + " (" + tx.input.pubkey + ") wants to join network senate!")
}