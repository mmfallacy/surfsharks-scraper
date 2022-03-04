const { default: axios } = require("axios");
const { v4: uuidv4 } = require("uuid");
const jsonifyFactory = require("./jsonify");
const path = require("path");
const flags = require("flags");

flags.defineInteger(
    "offset",
    0,
    "--offset n: Tell scraper to start parsing from the nth nft (MAX: 1910)"
);

flags.defineInteger(
    "limit",
    30,
    "--limit n: Tell scraper to parse n number of nfts per run (MAX: 30)"
);

flags.defineString(
    "filename",
    "",
    "--filename s: Set filename of parsed output to s"
);

flags.defineInteger(
    "random",
    -1,
    "--random n: Generate n random token addresses and get information"
);

flags.defineInteger(
    "max",
    1910,
    "--max n: Set max number of NFTs for random generation"
);

flags.parse();

const OUTPUT_FOLDER = path.join(__dirname, "/out");

const URL = "https://api.solscan.io";

const COLLECTION_ID =
    "e3616c270b7059e3cb358faffc37d5cb28e38f7480be247843eae06abf699048";

const OUT_UUID = flags.get("filename") || uuidv4();

const JSONWrite = jsonifyFactory(OUT_UUID, OUTPUT_FOLDER);
const JSONErr = jsonifyFactory(OUT_UUID, path.join(OUTPUT_FOLDER, "/err"));

const OFFSET = flags.get("offset");

const LIMIT = flags.get("limit");

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
    return response.data.data.result[0].owner;
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

const getRandomNFTs = async (size, max) => {
    const NFTs = [];

    while (NFTs.length < size) {
        const N = Math.floor(Math.random() * max);

        const tokenAddr = (
            await getNFTsFromCollectionId(COLLECTION_ID, N, 1)
        )[0];
        console.log(tokenAddr);
        try {
            const ownerAddr = await getOwnerFromTokenAddress(tokenAddr);
            const mintSig = await getMintSignature(tokenAddr);
            const mintPrice = await getMintPrice(mintSig);

            NFTs.push({ tokenAddr, ownerAddr, mintSig, mintPrice });
        } catch (err) {
            console.error(
                err?.response?.status,
                err?.response?.headers,
                tokenAddr
            );
        }
    }

    JSONWrite(NFTs, { COUNT: NFTs.length });
    console.log(NFTs);
};

async function main() {
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
                console.error(
                    err.response.status,
                    "ERROR at TOKEN: ",
                    tokenAddr
                );
                JSONErr([
                    {
                        token: tokenAddr,
                        err: {
                            status: err.response.status,
                            headers: err.response.headers,
                        },
                    },
                ]);
                return null;
            }
        })
    );

    JSONWrite(NFTs, { OFFSET, LIMIT, COUNT: NFTs.length });
    console.log(NFTs);
}

flags.get("random") > 0
    ? getRandomNFTs(flags.get("random"), flags.get("max"))
    : main();
