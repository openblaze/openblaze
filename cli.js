#!/usr/bin/env node
const defaults = require("./defaults.json")
let { Command } = require('commander');
let program = new Command(defaults.projectName);
let os = require('os');
let fs = require("fs");
let { fetch } = require("undici")
let JSON5 = require("json5")
const readline = require('node:readline');

let { bls12_381: bls } = require('@noble/curves/bls12-381');

let path = require("path");

program.command('keygen')
    .description('Generate new BLS12-381 keypair')
    .action((str, options) => {
        let privkey = bls.utils.randomPrivateKey()
        let pubkey = bls.getPublicKey(privkey)
        console.log("Successfully generated!\n")
        console.log("Private key:", Buffer.from(privkey).toString("base64url"))
        console.log("Public key:", Buffer.from(pubkey).toString("base64url"))
    });
program.command('make-genesis-ps <pubkey>')
    .description('Make genesis power snapshot from pubkey')
    .action((str, options) => {
        console.log(`genesis:${str}:${str}`)
    });


let b64command = program.command('base64').description("Operations with base64 encoding")

b64command.command("encode <string>")
    .description('Encode utf8 string to base64')
    .action((str, options) => {
        console.log(Buffer.from(str).toString("base64url"))
    });

b64command.command("decode <string>")
    .description('Decode base64 string to utf8')
    .action((str, options) => {
        console.log(Buffer.from(str, "base64url").toString("utf8"))
    });


program.command("sign <privkey> <data>")
    .description("Sign base64 encoded data with private key using BLS12-381 algorithm")
    .action((key, data) => {
        let decodedKey = Buffer.from(key, "base64")
        let decodedData = Buffer.from(data, "base64")
        console.log(Buffer.from(bls.sign(decodedData, decodedKey)).toString("base64url"))
    })


program.command("verify <pubkey> <data> <signature>")
    .description("Verify BLS12-381 signature")
    .action((key, data, signature) => {
        let decodedKey = Buffer.from(key, "base64")
        let decodedData = Buffer.from(data, "base64")
        let decodedSignature = Buffer.from(signature, "base64")
        const isValid = bls.verify(decodedSignature, decodedData, decodedKey);
        console.log(isValid ? "SUCCESS" : "FAIL")
    })


program.command("priv2pub <privkey>")
    .description("Extract public BLS12-381 key from private")
    .action((privkey) => {
        let decodedKey = Buffer.from(privkey, "base64")
        console.log(Buffer.from(bls.getPublicKey(decodedKey)).toString("base64url"))
    })
program.command("query <nodeAddress> <queryType> <queryInput>").description("Query network")
    .action(async (nodeAddress, type, input) => {
        console.log(await fetch('http://' + nodeAddress + "/provedQuery", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
                type: type,
                input: JSON.parse(input)
            })
        }).then(res => res.json()))
    })
program.command("broadcast <nodeAddress> <privkey> <transactionType> <transactionInput>")
    .description("Broadcast transaction to network")
    .action(async (nodeAddress, privkey, type, txInput) => {
        let decodedKey = Buffer.from(privkey, "base64")
        let pubkey = Buffer.from(bls.getPublicKey(decodedKey)).toString("base64url")
        let anchoredTxId = await fetch('http://' + nodeAddress + "/lastTxId/" + pubkey).then(res => res.text())
        console.log("Anchor: " + anchoredTxId)
        if (anchoredTxId == "null") {
            anchoredTxId = null
        }
        let input = JSON.parse(txInput)

        let expires = Date.now() + 40000


        console.log(await fetch('http://' + nodeAddress + "/broadcastTx", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
                senateSignatures: [],
                anchoredTxId,
                signer: pubkey,
                type,
                expires,
                input,
                signature: Buffer.from(bls.sign(Buffer.from(JSON.stringify({ input, type, anchoredTxId, expires })), decodedKey)).toString("base64url")

            })
        }).then(res => res.json()))

    })

let daemon = program.command("daemon")
    .description("Manage " + defaults.fullProjectName + " network daemon")

daemon.command("init [directory]")
    .description("Initialize " + defaults.fullProjectName + " daemon working directory")
    .option('--use-defaults')
    .option('--overwrite')
    .option('--bootstrap')
    .action(async (dirname, options) => {
        dirname = path.resolve((dirname || "~/." + defaults.projectName).replaceAll("~", os.homedir()))
        if (!fs.existsSync(dirname)) { fs.mkdirSync(dirname, { recursive: true }) } else {
            if (options.overwrite) {
                fs.rmSync(dirname, { recursive: true, force: true })
                fs.mkdirSync(dirname, { recursive: true })
            } else {
                return console.error("This directory already exists! Use with --overwrite to replace daemon config with fresh one")
            }

        }
        let genesis = JSON5.parse(fs.readFileSync(path.join(__dirname, "genesis.json5"), "utf8"))
        let privkey = bls.utils.randomPrivateKey()
        if (!options.useDefaults) { console.log("\nQuestions below are optional, you can skip it by entering empty line (just enter), however it's highly not recommended for decentralization reasons.\n") }
        let daemonConfig = {

            privkey: Buffer.from(privkey).toString("base64url"),
            pubkey: Buffer.from(bls.getPublicKey(privkey)).toString("base64url"),
            ...(options.useDefaults ? { seedPeers: "", trustedPowerSnapshot: "", externalIp: "" } : { seedPeers: await ask("Enter seed peers, separated by space:"), trustedPowerSnapshot: await ask("Enter trusted power snapshot:"), externalIp: await ask("Enter external IP address:") })
        }
        if (daemonConfig.seedPeers.length == 0) {
            daemonConfig.seedPeers = defaults.seedPeers
        }
        if (daemonConfig.trustedPowerSnapshot.length == 0) {
            daemonConfig.trustedPowerSnapshot = defaults.trustedPowerSnapshot
        }
        if (daemonConfig.externalIp.length == 0) {
            daemonConfig.externalIp = await fetch("https://ifconfig.me/ip").then(res => res.text())
        }
        if (options.bootstrap) {
            console.log("Bootstrapping chain")
            daemonConfig.trustedPowerSnapshot = `genesis:${daemonConfig.pubkey}:${daemonConfig.pubkey}`
            genesis.senators[daemonConfig.pubkey] = { name: "Genesis node", links: [], description: "", contacts: [], lastRewardsClaim: Date.now() }
        }
        daemonConfig.nodeAddress = daemonConfig.externalIp + ":11520"

        fs.writeFileSync(path.join(dirname, "config.json"), JSON.stringify(daemonConfig, null, " "))
        fs.writeFileSync(path.join(dirname, "peers.json"), JSON.stringify([daemonConfig.externalIp + ":11520", ...daemonConfig.seedPeers.split(" ").filter(e => e.length > 0)]))
        fs.writeFileSync(path.join(dirname, "state.json"), JSON.stringify(genesis, null, " "))
        fs.writeFileSync(path.join(dirname, "powerSnapshots.json"), JSON.stringify([daemonConfig.trustedPowerSnapshot]))
        console.log("Succesfully initialized in " + dirname)
        console.log("Consensus pubkey: " + daemonConfig.pubkey)
        console.log("Consensus privkey can be found in " + path.join(dirname, "config.json"))
    })
daemon.command("start [directory]")
    .description("Start " + defaults.fullProjectName + " daemon")
    .action(async (dirname) => {
        dirname = path.resolve((dirname || "~/." + defaults.projectName).replaceAll("~", os.homedir()))
        require("./daemon.js")(dirname)
    })
program.parse()
function ask(prompt) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question(prompt, (reply) => {
            rl.close()
            resolve(reply)
        }
        )

    })

}