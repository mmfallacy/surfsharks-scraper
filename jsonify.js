const fs = require("fs");
const fsPromises = fs.promises;
const path = require("path");

const OUTPUT_FOLDER = path.join(__dirname, "/out");

function writeFactory(UUID) {
    return async function write(data, metadata) {
        try {
            let DATA = [];
            let META = {};
            const OUT_PATH = path.join(OUTPUT_FOLDER, `${UUID}.json`);
            if (fs.existsSync(OUT_PATH)) {
                const JSONDATA = JSON.parse(
                    await fsPromises.readFile(OUT_PATH)
                );
                DATA = JSONDATA?.data || [];
                META = JSONDATA?.metadata || {};
            }
            await fsPromises.writeFile(
                OUT_PATH,
                JSON.stringify({
                    metadata: { ...META, ...metadata },
                    data: [...DATA, ...data],
                })
            );
            return UUID;
        } catch (err) {
            console.error(err);
        }
    };
}
module.exports = writeFactory;
