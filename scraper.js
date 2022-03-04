const { default: axios } = require("axios");
const { v4: uuidv4 } = require("uuid");
const jsonifyFactory = require("./jsonify");

const URL = "https://api.solscan.io";

const COLLECTION_ID =
    "e3616c270b7059e3cb358faffc37d5cb28e38f7480be247843eae06abf699048";

const OUT_UUID = uuidv4();
const jsonify = jsonifyFactory(OUT_UUID);

const OFFSET = 0;

const LIMIT = 24;

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

const getTransactionDetails = async (signature) => {
    const response = await axios.get(`${URL}/transaction`, {
        params: { tx: signature },
    });
};

(async function main() {
    return;
    const NFTAddresses = await getNFTsFromCollectionId(
        COLLECTION_ID,
        OFFSET,
        LIMIT
    );

    const NFTs = await Promise.all(
        NFTAddresses.map(async (addr) => ({
            tokenAddr: addr,
            ownerAddr: await getOwnerFromTokenAddress(addr),
        }))
    );

    console.log(NFTs);
})();
