MRP_SERVER = null;

emit('mrp:getSharedObject', obj => MRP_SERVER = obj);

while (MRP_SERVER == null) {
    print('Waiting for shared object....');
}

function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}

function genAcc() {
    return '69-' + getRandomIntInclusive(1000, 9999) + '-' + getRandomIntInclusive(1000, 9999) + '-' + getRandomIntInclusive(1000, 9999);
}

function generateAccountNumber() {
    let getNum = function(resolve) {
        let acc = genAcc();
        //first check if account with this number doesn't exist yet
        MRP_SERVER.count('banking_account', {
            accountNumber: acc
        }, (count) => {
            if (count == 0)
                resolve(acc);
            else
                getNum(resolve);
        });
    };

    return new Promise((resolve) => {
        getNum(resolve);
    });
}

onNet('mrp:bankin:server:createAccount', (source, data, uuid) => {
    let exec = async () => {
        let generatedAccount = await generateAccountNumber();
        let char = MRP_SERVER.getSpawnedCharacter(source);

        let defaultAcc = false;
        if (data.type == 'personal') {
            //first check if I have a personal account already to do a default one
            MRP_SERVER.count('banking_account', {
                owner: char._id,
                type: 'personal',
                default: true
            }, (count) => {
                if (count > 0)
                    defaultAcc = false;
                else
                    defaultAcc = true;

                MRP_SERVER.create('banking_account', {
                    accountNumber: generatedAccount,
                    name: data.account_name,
                    type: data.type,
                    owner: char._id,
                    default: defaultAcc,
                    money: 0
                }, (result) => {
                    emitNet('mrp:bankin:server:createAccount:response', source, result, uuid);
                });
            });
        } else {
            MRP_SERVER.create('banking_account', {
                accountNumber: generatedAccount,
                name: data.account_name,
                type: data.type,
                owner: char._id,
                default: defaultAcc,
                money: 0
            }, (result) => {
                emitNet('mrp:bankin:server:createAccount:response', source, result, uuid);
            });
        }
    };
    exec();
});

onNet('mrp:bankin:server:getAccounts', (source, data, uuid) => {
    let char = MRP_SERVER.getSpawnedCharacter(source);
    exports["mrp_core"].log(`Getting bank accounts for [${source}] [${JSON.stringify(data)}]`);
    if (char) {
        MRP_SERVER.count('banking_account', {
            owner: char._id,
            type: data.type
        }, (count) => {
            MRP_SERVER.find('banking_account', {
                owner: char._id,
                type: data.type
            }, undefined, undefined, (result) => {
                let retData = {
                    totalCount: count,
                    result: result
                };
                exports["mrp_core"].log(`Found total accounts [${count}]`);
                emitNet('mrp:bankin:server:getAccounts:response', source, retData, uuid);
            });
        });
    } else {
        emitNet('mrp:bankin:server:getAccounts:response', source, [], uuid);
    }
});

onNet('mrp:bankin:server:withdraw', (source, data, uuid) => {
    let char = MRP_SERVER.getSpawnedCharacter(source);
    if (char) {
        data.account.money -= parseInt(data.withdraw_amount);
        MRP_SERVER.update('banking_account', data.account, {
            _id: data.account._id
        }, null, (result) => {
            if (result.modifiedCount > 0) {
                exports["mrp_core"].log('Bank account updated after withdraw!');
                char.stats.cash += parseInt(data.withdraw_amount);
                emit('mrp:updateCharacter', char);
                emitNet('mrp:updateCharacter', source, char);
            }
            emitNet('mrp:bankin:server:withdraw:response', source, result, uuid);
        });
    }
});

onNet('mrp:bankin:server:deposit', (source, data, uuid) => {
    //TODO add transaction logs
    let char = MRP_SERVER.getSpawnedCharacter(source);
    if (char) {
        data.account.money += parseInt(data.deposit_amount);
        MRP_SERVER.update('banking_account', data.account, {
            _id: data.account._id
        }, null, (result) => {
            if (result.modifiedCount > 0) {
                exports["mrp_core"].log('Bank account updated after deposit!');
                char.stats.cash -= parseInt(data.deposit_amount);
                emit('mrp:updateCharacter', char);
                emitNet('mrp:updateCharacter', source, char);
            }
            emitNet('mrp:bankin:server:deposit:response', source, result, uuid);
        });
    }
});

onNet('mrp:bankin:server:transfer', (source, data, uuid) => {
    MRP_SERVER.read('banking_account', {
        accountNumber: data.transfer_account
    }, (transferAccount) => {
        if (!transferAccount) {
            emitNet('mrp:bankin:server:transfer:response', source, {
                modifiedCount: 0
            }, uuid);
        } else {
            data.account.money -= parseInt(data.transfer_amount);
            MRP_SERVER.update('banking_account', data.account, {
                _id: data.account._id
            }, null, (result) => {
                if (result.modifiedCount <= 0) {
                    emitNet('mrp:bankin:server:transfer:response', source, {
                        modifiedCount: 0
                    }, uuid);
                    return;
                }

                transferAccount.money += parseInt(data.transfer_amount);
                MRP_SERVER.update('banking_account', transferAccount, {
                    _id: transferAccount._id
                }, null, (res) => {
                    if (res.modifiedCount > 0) {
                        exports["mrp_core"].log('Bank account updated after transfer!');
                    }
                    emitNet('mrp:bankin:server:transfer:response', source, result, uuid);
                });
            });
        }
    });
});

RegisterCommand('spawnCash', (source, args) => {
    let playerId = args[0];
    let ammount = args[1];
    if (!playerId)
        return;

    if (!ammount)
        return;

    let char = MRP_SERVER.getSpawnedCharacter(playerId);
    if (char) {
        char.stats.cash += parseInt(ammount);
        MRP_SERVER.updateSpawnedChar(playerId, char);
        emit('mrp:updateCharacter', char);
        emitNet('mrp:updateCharacter', playerId, char);
    }
}, true);