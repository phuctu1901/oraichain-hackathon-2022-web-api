const path = require('path');
const fetch = require('isomorphic-fetch');
const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const { stringToPath } = require("@cosmjs/crypto");
const cosmwasm = require('@cosmjs/cosmwasm-stargate');
const { GasPrice } = require('@cosmjs/cosmwasm-stargate/node_modules/@cosmjs/stargate/build');
require('dotenv').config({ path: path.resolve(__dirname, process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : ".env") })
var express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const ipfsAPI = require('ipfs-api');
const fs = require('fs');
// .env file
const ipfs = ipfsAPI(process.env.IPFS_GATEWAY, '5001', { protocol: 'http' })
/**
 * MNEMONIC=""
WEBSOCKET_URL=ws://testnet-rpc.orai.io // testnet ip
LCD_URL=http://testnet-lcd.orai.io
CONTRACT_ADDRESS=orai1s60a2vntfuv2ps6fs75fcrlrmea9xzr4k65zlg // testnet contract
BACKEND_URL=https://testnet-aioracle-svr.orai.io
 */
// ipfs.files.get("QmNnBKob6pLHeh1vLnxVJRnWBacrq13juyrgNziokok7YL", function (err, files) {
//     files.forEach((file) => {
//         console.log(file.path)
//         console.log(file.content.toString('utf8'))
//     })
// })

//Reading file from computer
let testFile = fs.readFileSync('/home/ftu191/Pictures/test.png');
//Creating buffer for ipfs function to add file to the system
let testBuffer = new Buffer(testFile);

//Addfile router for adding file a local file to the IPFS network without any local node

    ipfs.files.add(testBuffer, function (err, file) {
        if (err) {
          console.log(err);
        }
        console.log(file)
      })

const network = {
    rpc: process.env.NETWORK_RPC || "https://testnet-rpc.orai.io",
    prefix: "orai",
}
// config
const contractAddr = process.env.CONTRACT_ADDRESS2;
console.log("contract addr: ", contractAddr)
const wallet = process.env.MNEMONIC;
const feeAmount = [{ denom: "orai", amount: "1000" }]
let finalFeeAmount = feeAmount.filter(fee => fee.amount !== '0');
if (finalFeeAmount.length === 0) finalFeeAmount = undefined;
// end config
const collectWallet = async (mnemonic) => {
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
        mnemonic,
        {
            hdPaths: [stringToPath("m/44'/118'/0'/0/0")],
            prefix: network.prefix,
        }
    );
    return wallet;
}

const execute = async ({ mnemonic, address, handleMsg, memo, amount, gasData = undefined }) => {
    try {
        const wallet = await collectWallet(mnemonic);
        const [firstAccount] = await wallet.getAccounts();
        const client = await cosmwasm.SigningCosmWasmClient.connectWithSigner(network.rpc, wallet, { gasPrice: gasData ? GasPrice.fromString(`${gasData.gasAmount}${gasData.denom}`) : undefined, prefix: network.prefix, gasLimits: { exec: 20000000 } });
        const input = JSON.parse(handleMsg);
        console.log(input)
        const result = await client.execute(firstAccount.address, address, input, memo, amount);
        return result.transactionHash;
    } catch (error) {
        console.log("error in executing contract: ", error);
        throw error;
    }
}

const add_transaction = async (data) => {

    const input = JSON.stringify({
        add_transaction: data
    })
    // store the merkle root on-chain
    const txHash = await execute({ mnemonic: wallet, address: contractAddr, handleMsg: input, gasData: { gasAmount: "0", denom: "orai" }, amount: finalFeeAmount });
    console.log("execute result: ", "https://testnet.scan.orai.io/txs/" + txHash);
    return txHash;

}


const app = express();
const port = 3000;

app.use(cors());

// Configuring body parser middleware
// app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


app.post('/addTransaction', async (req, res) => {
    // {
    //     "status": 1,
    //     "user_id": "orai1s60a2vntfuv2ps6fs75fcrlrmea9xzr4k65zlg",
    //     "input_data": "d8fee08829e1e3d621ed3985d6e3e196",
    //     "ai_service_id": "121",
    //     "ai_output_data": "orai14n3tx8s5ftzhlxvq0w5962v60vd82h30rha573",
    //     "ai_provider_id": "orai17jfg0q25wzqqr46cpuwvhksakgxhgmf0xsqjw5",
    //     "experts_output_data": "d8fee08829e1e3d621ed3985d6e3e196"
    // }
    const transaction = req.body;
    const txhash = await add_transaction(transaction)

    res.send({ txHash: txhash });
});

app.listen(port, () => console.log(`Hello world app listening on port ${port}!`));