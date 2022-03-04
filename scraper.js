const { default: axios } = require("axios");
const { v4: uuidv4 } = require("uuid");
const jsonifyFactory = require("./jsonify");
const path = require("path");

const OUTPUT_FOLDER = path.join(__dirname, "/out");

const URL = "https://api.solscan.io";

const COLLECTION_ID =
    "e3616c270b7059e3cb358faffc37d5cb28e38f7480be247843eae06abf699048";

const OUT_UUID = uuidv4();
const JSONWrite = jsonifyFactory(OUT_UUID, OUTPUT_FOLDER);
const JSONErr = jsonifyFactory(OUT_UUID, path.join(OUTPUT_FOLDER, "/err"));

const OFFSET = 0;

const LIMIT = 30;

const getNFTsFromCollectionId = async (id, off, lim) => {
    const response = await axios.get(`${URL}/collection/nft`, {
        params: {
            sortBy: "nameDec",
            collectionId: id,
            offset: off,
            limit: lim,
        },
    });
    return response.data.data.map((nft) => nft.info.mint);
};

const getOwnerFromTokenAddress = async (addr) => {
    const response = await axios.get(`${URL}/token/holders`, {
        params: {
            token: addr,
            offset: 0,
            size: 20,
        },
    });
    console.log("TOKEN ADDR: ", addr);
    console.log(response.data.data);
    return response.data.data.result[0].address;
};

const getMintSignature = async (addr) => {
    const response = await axios.get(`${URL}/transfer/token`, {
        params: { token_address: addr, type: "mint", offset: 0, limit: 10 },
    });
    if (response.data.data.total > 1)
        throw Error(`Mint txn more than 1 for address: ${addr}`);

    return response.data.data.items[0].txHash;
};

const getMintPrice = async (mint_signature) => {
    const response = await axios.get(`${URL}/transaction`, {
        params: { tx: mint_signature },
    });

    return response.data.innerInstructions[1].parsedInstructions[0].params
        .amount;
};

(async function main() {
    const NFTAddresses = await getNFTsFromCollectionId(
        COLLECTION_ID,
        OFFSET,
        LIMIT
    );

    const NFTs = await Promise.all(
        NFTAddresses.map(async (tokenAddr) => {
            try {
                const ownerAddr = await getOwnerFromTokenAddress(tokenAddr);
                const mintSig = await getMintSignature(tokenAddr);
                const mintPrice = await getMintPrice(mintSig);

                return { tokenAddr, ownerAddr, mintSig, mintPrice };
            } catch (err) {
                console.log("ERROR at TOKEN: ", tokenAddr);
                JSONErr([
                    {
                        token: tokenAddr,
                    },
                ]);
                return null;
            }
        })
    );

    JSONWrite(NFTs, { OFFSET, LIMIT });
    console.log(NFTs);
})();
