export default async function runWithConcurrency(tasks, limit) {
    const results = [];
    let currentIndex = 0;
    let running = 0;

    return new Promise((resolve, reject) => {
        const next = () => {
            if (currentIndex === tasks.length && running === 0) {
                return resolve(results);
            }

            while (running < limit && currentIndex < tasks.length) {
                const index = currentIndex++;
                const task = tasks[index];
                running++;

                Promise.resolve(task())
                    .then(result => {
                        console.info(["fulfilled"],{ sucesso:result})
                        results[index] = { status: 'fulfilled', value: result };
                    })
                    .catch(error => {
                       console.info(["rejected"], { error })
                        results[index] = { status: 'rejected', reason: error };
                    })
                    .finally(() => {
                        running--;
                        next(); // chama o próximo quando um termina
                    });
            }
        };

        next(); // inicializa a execução
    });
}
