module.exports = async function (fastify, opts) {
    fastify.get("/peers", async (request, reply) => {
        return [...peers]
    })
    fastify.post("/listPeer", async (request, reply) => {
        peers.add(request.body)
        needToWrite.add("peers")
        return { ok: true }
    })
}