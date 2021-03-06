require("babel-polyfill"); // side-effects...
const TransportNodeHid = require("@ledgerhq/hw-transport-node-hid").default;
const Z = require("./zil-ledger-js-interface").default;
const readline = require('readline');
const chalk = require('chalk');
const fs = require('fs');
const curl = require('curlrequest')

const ELF_URL = 'https://github.com/Zilliqa/ledger-app-zilliqa/releases/download/v0.4.0/app.hex';

function getReadlineInterface() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });
}

async function open() {
    // This might throw if device not connected via USB
    const t = await TransportNodeHid.open("");
    t.setDebugMode(true);
    return t;
}

async function downloadInstallApp() {
    const opts = {url: ELF_URL, timeout: 5, encoding: null};
    return await new Promise( (resolve, reject) => {
        curl.request(opts, function (err, hexFile) {
            if (err) {
                return reject(err);
            }

            fs.writeFile("./app.hex", hexFile, function (err) {
                if (err) {
                    return reject(err);
                }

                console.info(chalk.blue("Downloaded Zilliqa hex file."));
                console.info(chalk.blue("Ledger device will ask you for confirmations..."));

                const proc = require("./installApp");
                proc.on('exit', (exitCode) => {
                    if (exitCode !== 0) {
                        console.error(`Installation failed: ${exitCode}`);
                        reject(exitCode);
                    }
                    else {
                        console.info(chalk.blue(`Installation successful!`));
                    }
                    return resolve({exitCode});
                });
            });
        });

    });
}

async function installApp (){
    return await new Promise( (resolve, reject) => {
        require("./installApp");
        const proc = require("./installApp");
        proc.on('exit', (exitCode) => {
            if (exitCode !== 0) {
                console.error(`Installation failed: ${exitCode}`);
                reject(exitCode);
            }
            else {
                console.info(chalk.blue(`Installation successful!`));
            }
            return resolve({exitCode});
        });
    });
}

async function getAppVersion() {
    const transport = await open();
    if (transport instanceof Error) {
        return transport.message
    }

    const zil = new Z(transport);
    return await zil.getVersion().then(r => {
        transport.close().catch(e => {
            console.error(e.message)
        }).then(() => {
            return r
        });
        return r;
    }).catch(e => { reject(e); });;
}

async function getPubKey() {
    const transport = await open();
    if (transport instanceof Error) {
        return transport.message
    }

    const q = "> Enter the key index: ";
    return await new Promise((resolve, reject) => {
        getReadlineInterface().question(chalk.yellow(q), async (index) => {
            if (isNaN(index)) {
                console.error("Index should be an integer.");
                return resolve("Bad input.");
            }
            const zil = new Z(transport);
            return zil.getPublicKey(index).then(r => {
                transport.close().catch(e => {
                    console.error(e.message);
                }).then(() => {
                    return resolve(r)
                });
                return resolve(r);
            }).catch(e => { reject(e); });

        });
    });
}

async function getPublicAddress() {
    const transport = await open();
    if (transport instanceof Error) {
        return transport.message
    }

    const q = "> Enter the key index: ";
    return await new Promise((resolve, reject) => {
        getReadlineInterface().question(chalk.yellow(q), async (index) => {
            if (isNaN(index)) {
                console.error("Index should be an integer.");
                return resolve("Bad input.");
            }
            const zil = new Z(transport);
            return zil.getPublicAddress(index).then(r => {
                transport.close().catch(e => {
                    console.error(e.message);
                }).then(() => {
                    return resolve(r)
                });
                return resolve(r);
            }).catch(e => { reject(e); });

        });
    });
}

async function signHash() {
    const transport = await open();
    const q = "> Enter the hash bytes: ";
    return await new Promise((resolve, reject) => {
        getReadlineInterface().question(chalk.yellow(q), async (hashStr) => {
            if (typeof hashStr !== "string") {
                console.error("hash should be a string.");
                return reject("Bad input.");
            }
            const q2 = "> Enter the key index: ";
            getReadlineInterface().question(chalk.yellow(q2), async (index) => {
                if (isNaN(index)) {
                    console.error("Index should be an integer.");
                    return reject("Bad input.");
                }
                const zil = new Z(transport);
                return zil.signHash(index, hashStr).then(r => {
                    transport.close().catch(e => {
                        console.error(e.message);
                    }).then(() => {
                        return resolve(r)
                    });
                    return resolve(r);
                }).catch(e => { reject(e); });;
            });
        });
    });
}

async function signTxn() {
    const transport = await open();
    if (transport instanceof Error) {
        return transport.message
    }

    const q = "> Enter the path to the transaction JSON file: ";
    return await new Promise((resolve, reject) => {
        getReadlineInterface().question(chalk.yellow(q), async (txnJsonFile) => {
            if (typeof txnJsonFile !== "string") {
                console.error("Need to specify path to a JSON file.");
                return resolve("Bad input.");
            }

            let txnParams;
            try {
                txnParams = JSON.parse(fs.readFileSync(txnJsonFile, 'utf8'));
            }
            catch (e) {
                reject(e);
                return;
            }

            const q2 = "> Enter the key index: ";
            getReadlineInterface().question(chalk.yellow(q2), async (keyIndex) => {
                if (isNaN(keyIndex)) {
                    console.error("Index should be an integer.");
                    return reject("Bad input.");
                }

                const zil = new Z(transport);
                return zil.signTxn(keyIndex, txnParams).then(r => {
                    transport.close().catch(e => {
                        console.error(e.message);
                    }).then(() => {
                        return resolve(r)
                    });
                    return resolve(r);
                }).catch(e => {
                    reject(e);
                });
            });
        });
    });
}

module.exports = [
    downloadInstallApp,
    installApp,
    getAppVersion,
    getPubKey,
    getPublicAddress,
    signTxn,
    signHash
];
