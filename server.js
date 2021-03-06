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
                owner: data.owner || char._id,
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
                    owner: data.owner || char._id,
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
                owner: data.owner || char._id,
                default: defaultAcc || data.default,
                money: 0
            }, (result) => {
                emitNet('mrp:bankin:server:createAccount:response', source, result, uuid);
            });
        }
    };
    exec();
});

onNet('mrp:bankin:server:getTransactions', (source, data, uuid) => {
    let mainPipe = [{
        '$match': {
            'accountNumber': data.account
        }
    }, {
        '$lookup': {
            'from': 'banking_account',
            'localField': 'accountNumber',
            'foreignField': '_id',
            'as': 'account'
        }
    }, {
        '$lookup': {
            'from': 'character',
            'localField': 'author',
            'foreignField': '_id',
            'as': 'authorChar'
        }
    }, {
        '$lookup': {
            'from': 'business',
            'localField': 'author',
            'foreignField': '_id',
            'as': 'business'
        }
    }, {
        '$lookup': {
            'from': 'banking_account',
            'localField': 'to',
            'foreignField': '_id',
            'as': 'toAccount'
        }
    }, {
        '$lookup': {
            'from': 'banking_account',
            'localField': 'from',
            'foreignField': '_id',
            'as': 'fromAccount'
        }
    }, {
        '$sort': {
            'timestamp': -1
        }
    }];

    let pagingPipe = [{
        '$skip': data.skip
    }, {
        '$limit': data.limit
    }];

    let pipe = mainPipe.concat([{
        '$facet': {
            'docCount': [{
                '$count': 'count'
            }],
            'data': mainPipe.concat(pagingPipe)
        }
    }]);

    MRP_SERVER.aggregate('banking_transaction', pipe, (result) => {
        emitNet('mrp:bankin:server:getTransactions:response', source, result, uuid);
    });
});

onNet('mrp:bankin:server:getAccounts', (source, data, uuid) => {
    let char = MRP_SERVER.getSpawnedCharacter(source);
    exports["mrp_core"].log(`Getting bank accounts for [${source}] [${JSON.stringify(data)}]`);
    if (char) {
        let query = {
            $or: [{
                owner: char._id,
                type: data.type
            }, {
                type: data.type,
                access: char._id
            }]
        };

        if (data.type == "business") {
            //check employee bank access
            MRP_SERVER.read('employment', {
                char: char._id
            }, (empRes) => {
                let retData = {
                    totalCount: 0,
                    result: []
                };
                if (empRes) {
                    let totalEmployments = 0;
                    if (empRes && empRes.employment)
                        totalEmployments = empRes.employment.length;

                    console.debug(`Total employments [${totalEmployments}]`);
                    let processedEmployments = 0;
                    for (let i in empRes.employment) {
                        let emp = empRes.employment[i];
                        let empRole = emp.role;
                        console.debug(`Get business for role [${empRole}]`);
                        MRP_SERVER.read('business', {
                            _id: emp.business
                        }, (busRes) => {
                            if (busRes) {
                                for (let role of busRes.roles) {
                                    if (role.name == empRole && role.hasBankAccess) {
                                        console.debug(`Has bank account for role [${empRole}]`);
                                        //has access to bank account
                                        MRP_SERVER.read('banking_account', {
                                            owner: emp.business
                                        }, (empAcc) => {
                                            processedEmployments++;
                                            console.debug(`Processed employments after account [${processedEmployments}]`);

                                            if (empAcc) {
                                                if (!retData.result)
                                                    retData.result = [];

                                                retData.totalCount++;
                                                retData.result.push(empAcc);
                                            }

                                            if (processedEmployments == totalEmployments) {
                                                console.debug(`Returning accounts [${JSON.stringify(retData)}]`);
                                                emitNet('mrp:bankin:server:getAccounts:response', source, retData, uuid);
                                            }
                                        });
                                        break;
                                    } else {
                                        processedEmployments++;
                                        console.debug(`Processed employments role doesn't match [${processedEmployments}]`);
                                    }
                                }
                            } else {
                                processedEmployments++;
                                console.debug(`Processed employments business not found [${processedEmployments}]`);
                                //TODO this may be an issue if not returning anything for last account as there is a listener hanging
                                //emitNet('mrp:bankin:server:getAccounts:response', source, retData, uuid);
                            }
                        });
                    }
                } else {
                    emitNet('mrp:bankin:server:getAccounts:response', source, retData, uuid);
                }
            });
        } else {
            MRP_SERVER.count('banking_account', query, (count) => {
                MRP_SERVER.find('banking_account', query, undefined, undefined, (result) => {
                    let retData = {
                        totalCount: count,
                        result: result
                    };
                    exports["mrp_core"].log(`Found total accounts [${count}]`);
                    emitNet('mrp:bankin:server:getAccounts:response', source, retData, uuid);
                });
            });
        }
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
                MRP_SERVER.create('banking_transaction', {
                    accountNumber: data.account._id,
                    type: 'withdraw',
                    author: char._id,
                    sum: -parseInt(data.withdraw_amount),
                    timestamp: Date.now()
                }, (r) => {
                    exports["mrp_core"].log('Created transaction log for withdraw');
                });

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
    if (!data.deposit_amount || isNaN(data.deposit_amount)) {
        console.debug(`Trying to deposit no money [${JSON.stringify(data)}]`);
        return;
    }
    let char = MRP_SERVER.getSpawnedCharacter(source);
    if (char) {
        data.account.money += parseInt(data.deposit_amount);
        MRP_SERVER.update('banking_account', data.account, {
            _id: data.account._id
        }, null, (result) => {
            if (result.modifiedCount > 0) {
                //create transaction log
                MRP_SERVER.create('banking_transaction', {
                    accountNumber: data.account._id,
                    type: 'deposit',
                    author: char._id,
                    sum: parseInt(data.deposit_amount),
                    timestamp: Date.now()
                }, (r) => {
                    exports["mrp_core"].log('Created transaction log for deposit');
                });

                exports["mrp_core"].log('Bank account updated after deposit!');
                char.stats.cash -= parseInt(data.deposit_amount);
                emit('mrp:updateCharacter', char);
                emitNet('mrp:updateCharacter', source, char);
            }
            emitNet('mrp:bankin:server:deposit:response', source, result, uuid);
        });
    }
});

onNet('mrp:bankin:server:deposit:byowner', (data) => {
    if (!data || !data.ammount || isNaN(data.ammount)) {
        console.debug(`Trying to deposit no money [${JSON.stringify(data)}]`);
        return;
    }

    MRP_SERVER.read('banking_account', {
        owner: data.owner,
        default: true
    }, (transferAccount) => {
        if (!transferAccount) {
            console.log(`No account found for id [${JSON.stringify(data.owner)}]`);
            return;
        }

        transferAccount.money += data.ammount;

        MRP_SERVER.update('banking_account', transferAccount, {
            _id: transferAccount._id
        }, null, (result) => {
            if (result.modifiedCount > 0) {
                //create transaction log
                MRP_SERVER.create('banking_transaction', {
                    accountNumber: transferAccount._id,
                    type: 'deposit',
                    author: data.origin,
                    sum: parseInt(data.ammount),
                    timestamp: Date.now()
                }, (r) => {
                    exports["mrp_core"].log('Created transaction log for deposit');
                });

                exports["mrp_core"].log('Bank account updated after deposit!');
            }
        });
    });
});

function transfer(source, data, uuid) {
    let char = MRP_SERVER.getSpawnedCharacter(source);
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

                MRP_SERVER.create('banking_transaction', {
                    accountNumber: data.account._id,
                    type: 'transfer',
                    author: char._id,
                    from: data.account._id,
                    to: transferAccount._id,
                    note: data.transfer_note,
                    sum: -parseInt(data.transfer_amount),
                    timestamp: Date.now()
                }, (r) => {
                    exports["mrp_core"].log('Created transaction log for withdraw');
                });

                transferAccount.money += parseInt(data.transfer_amount);
                MRP_SERVER.update('banking_account', transferAccount, {
                    _id: transferAccount._id
                }, null, (res) => {
                    if (res.modifiedCount > 0) {
                        MRP_SERVER.create('banking_transaction', {
                            accountNumber: transferAccount._id,
                            type: 'transfer',
                            author: char._id,
                            from: data.account._id,
                            to: transferAccount._id,
                            note: data.transfer_note,
                            sum: parseInt(data.transfer_amount),
                            timestamp: Date.now()
                        }, (r) => {
                            exports["mrp_core"].log('Created transaction log for withdraw');
                        });

                        exports["mrp_core"].log('Bank account updated after transfer!');
                    }
                    emitNet('mrp:bankin:server:transfer:response', source, result, uuid);
                });
            });
        }
    });
}

onNet('mrp:bankin:server:transfer', (source, data, uuid) => {
    if (data.transfer_account.indexOf("-") == -1) {
        //this is a state ID
        const agg = [{
            '$lookup': {
                'from': 'character',
                'localField': 'owner',
                'foreignField': '_id',
                'as': 'ownerObj'
            }
        }, {
            '$match': {
                'default': true,
                'ownerObj.stateId': parseInt(data.transfer_account)
            }
        }];
        MRP_SERVER.aggregate('banking_account', agg, (documents) => {
            if (documents && documents.length > 0) {
                let accountNumber = documents[0].accountNumber;
                data.transfer_account = accountNumber;
                transfer(source, data, uuid);
            } else {
                transfer(source, data, uuid);
            }
        });
    } else {
        transfer(source, data, uuid);
    }
});

onNet('mrp:bankin:server:pay:cash', (source, price) => {
    let char = MRP_SERVER.getSpawnedCharacter(source);
    if (char) {
        char.stats.cash -= parseInt(price);
        MRP_SERVER.updateSpawnedChar(source, char);
        emit('mrp:updateCharacter', char);
        emitNet('mrp:updateCharacter', source, char);
    }
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

onNet('mrp:bankin:server:add:cash', (source, amount) => {
    let char = MRP_SERVER.getSpawnedCharacter(source);
    if (char) {
        char.stats.cash += parseInt(amount);
        MRP_SERVER.updateSpawnedChar(source, char);
        emit('mrp:updateCharacter', char);
        emitNet('mrp:updateCharacter', source, char);
    }
});

RegisterCommand('giveCash', (source, args) => {
    let targetId = args[0];
    let ammount = args[1];
    if (!targetId)
        return;

    //can't give to self to spawn money
    if (source == targetId)
        return;

    if (!ammount)
        return;

    let fromChar = MRP_SERVER.getSpawnedCharacter(source);
    let toChar = MRP_SERVER.getSpawnedCharacter(targetId);
    if (fromChar && toChar) {
        fromChar.stats.cash -= parseInt(ammount);
        toChar.stats.cash += parseInt(ammount);


        MRP_SERVER.updateSpawnedChar(source, fromChar);
        emit('mrp:updateCharacter', fromChar);
        emitNet('mrp:updateCharacter', source, fromChar);

        MRP_SERVER.updateSpawnedChar(targetId, toChar);
        emit('mrp:updateCharacter', toChar);
        emitNet('mrp:updateCharacter', targetId, toChar);
    }
});