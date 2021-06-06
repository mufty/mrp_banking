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
        MRP_SERVER.create('banking_account', {
            accountNumber: generatedAccount,
            name: data.account_name,
            owner: char._id,
            default: true,
            money: 0
        }, (result) => {
            emitNet('mrp:bankin:server:createAccount:response', source, result, uuid);
        });
    };
    exec();
});