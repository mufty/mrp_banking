MRP_CLIENT = null;

emit('mrp:getSharedObject', obj => MRP_CLIENT = obj);

while (MRP_CLIENT == null) {
    print('Waiting for shared object....');
}

eval(LoadResourceFile('mrp_core', 'client/helpers.js'));

configFile = LoadResourceFile(GetCurrentResourceName(), 'config/config.json');

config = JSON.parse(configFile);

if (config.showBlips) {
    for (let v of config.banks) {
        let blip = AddBlipForCoord(v.x, v.y, v.z);
        SetBlipSprite(blip, v.id);
        SetBlipScale(blip, 0.8);
        SetBlipAsShortRange(blip, true);
        if (v.principal)
            SetBlipColour(blip, 77);

        BeginTextCommandSetBlipName("STRING");
        AddTextComponentString(v.name);
        EndTextCommandSetBlipName(blip);
    }
}

function nearATM() {
    let [x, y, z] = GetEntityCoords(PlayerPedId());

    if (config.useObjects) {
        for (let prop of config.atmProps) {
            let entity = GetClosestObjectOfType(x, y, z, 1.0, GetHashKey(prop), false, false, false);
            //let entityCoords = GetEntityCoords(entity);

            if (DoesEntityExist(entity))
                return true;
        }
    } else {
        for (let search of config.atms) {
            let distance = GetDistanceBetweenCoords(search.x, search.y, search.z, x, y, z, true);

            if (distance <= 1)
                return true;
        }
    }
}

function nearBank() {
    let [x, y, z] = GetEntityCoords(PlayerPedId());

    for (let search of config.banks) {
        let distance = GetDistanceBetweenCoords(search.x, search.y, search.z, x, y, z, true);
        if (distance <= 2)
            return true;
    }
}

function displayHelpText(str) {
    BeginTextCommandDisplayHelp("STRING");
    AddTextComponentString(str);
    EndTextCommandDisplayHelp(0, false, true, -1);
}

function playBankAnim() {
    emit("mrp:lua:taskPlayAnim", PlayerPedId(), "random@atmrobberygen", "a_atm_mugging", 8.0, 3.0, 2000, 0, 1, false, false, false);
}

async function playWalletProps() {
    let ped = PlayerPedId();
    let [x, y, z] = GetEntityCoords(ped);
    let wallet = CreateObject(GetHashKey('prop_ld_wallet_01'), x, y, z, true);
    AttachEntityToEntity(wallet, ped, GetPedBoneIndex(ped, 0x49D9), 0.17, 0.0, 0.019, -120.0, 0.0, 0.0, 1, 0, 0, 0, 0, 1);
    await utils.sleep(500);
    let id = CreateObject(GetHashKey('prop_michael_sec_id'), x, y, z, true);
    AttachEntityToEntity(id, ped, GetPedBoneIndex(ped, 0xDEAD), 0.150, 0.045, -0.015, 0.0, 0.0, 180.0, 1, 0, 0, 0, 0, 1);
    await utils.sleep(500);
    deleteProps(wallet, id);
}

async function deleteProps(wallet, id) {
    DeleteEntity(id);
    await utils.sleep(500);
    DeleteEntity(wallet);
}

on('mrp:banking:ui:show', () => {
    SetNuiFocus(true, true);
    SendNuiMessage(JSON.stringify({
        type: 'show'
    }));
    playBankAnim();
    playWalletProps();
});

setInterval(() => {
    if (nearBank()) {
        displayHelpText(config.helpText1);

        if (IsControlJustPressed(1, 38)) {
            emit('mrp:banking:ui:show');
        }
    } else if (nearATM()) {
        if (config.useATMS) {
            displayHelpText(config.helpText2);

            if (IsControlJustPressed(1, 38)) {
                emit('mrp:banking:ui:show');
            }

            if (IsControlJustPressed(1, 322)) {
                SetNuiFocus(false, false);
                SendNuiMessage(JSON.stringify({
                    type: 'close'
                }));
            }
        }
    }
}, 1);

RegisterNuiCallbackType('close');
on('__cfx_nui:close', (data, cb) => {
    SetNuiFocus(false, false);
    cb();
});

RegisterNuiCallbackType('create_account');
on('__cfx_nui:create_account', (data, cb) => {
    MRP_CLIENT.TriggerServerCallback('mrp:bankin:server:createAccount', [data], (result) => {
        cb(result);
    });
});