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