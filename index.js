import Papa from 'papaparse';
import { createReadStream } from 'fs';
import runWithConcurrency from "./concurrency.js"


const API_URL =process.env.API_URL;
const BEARER_TOKEN = process.env.BEARER_TOKEN;

async function requestInAPI(reference) {
    await delay(130)
    return fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${BEARER_TOKEN}`
        },
        body: JSON.stringify(reference)
    }).then(async (res) => {
        if (!res.ok) {
            const errorBody = await res.text();
            throw new Error(`Erro na requisição: ${res.status} - ${errorBody}`);
        }
        return res.json(); // ou .text() se a resposta não for JSON
    });

}
async function createchuncks(references) {
    const isArrayReferences = Array.isArray(references)
    const chuncks = []
    const chunckSize = 100

    if (isArrayReferences && references.length > 100) {
        const controllerLimiter = Math.ceil(references.length / 100)
        for (let constroller = 0; constroller < controllerLimiter; constroller++) {

            const start = constroller * chunckSize
            const limit = start + chunckSize
            const chunck = references.slice(start, limit)
            chuncks.push(chunck)
        }
    }
    if (isArrayReferences && references.length > 1 && references.length <= 100) {
        chuncks.push(references)
    }

    return chuncks

}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {

    const readStream = createReadStream(`./Referencias.csv`, 'utf8');
    const parseCsvReferences = () =>
        new Promise((resolve, reject) => {

            Papa.parse(readStream, {
                header: true,
                skipEmptyLines: true,
                delimiter: ",",
                quoteChar: '"',
                dynamicTyping: true,
                complete: (result) => {
                    const references = []
                    try {
                        result.data.forEach((sourceData) => {
                            const reference = sourceData.num_referencia.length === 9 ? `${sourceData.num_referencia}` : `00${sourceData.num_referencia}`
                            const InputRef = {
                                num_referencia: reference,
                                data_limite_pagamento: sourceData.data_limite_pagamento
                            };
                            references.push(InputRef);
                        });

                        resolve(references);
                    } catch (error) {
                        reject(error);
                    }
                },
            });
        });

    const references_parsed = await parseCsvReferences()
    const chunks = await createchuncks(references_parsed)
    if ((chunks).length) {
        const tasks = chunks.flatMap(chunk =>
            chunk.map(ref => () => requestInAPI(ref))
        );
        const results = await runWithConcurrency(tasks, 10); // até 10 ao mesmo tem
        results.forEach((res, i) => {
        if (res.status === 'fulfilled') {
            console.log(`Chunk ${i} enviado com sucesso.`);
        } else {
            console.error(`Erro ao enviar chunk ${i}:`, res.reason);
        }
    })
    }
    
    
}
main()