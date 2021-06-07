$(document).ready(() => {
    let config = {
        skip: 0,
        limit: 9,
        currency: '$'
    };

    $('body').hide();

    $('.account_list .account_types a').click(function() {
        $('.account_list .account_types a.selected').removeClass('selected');
        $(this).toggleClass('selected');
        showAccountList();
    });

    $('.create_account .account_types a').click(function() {
        $('.create_account .account_types a.selected').removeClass('selected');
        $(this).toggleClass('selected');
    });

    $('.paging a').click(function() {
        $('.paging a.selected').removeClass('selected');
        $(this).toggleClass('selected');
    });

    function showCreateAccount() {
        $('.account_list').hide();
        $('.account_detail').hide();
        $('.deposit').hide();
        $('.withdraw').hide();
        $('.transfer').hide();
        $('.create_account').show();
    }

    $('.account_list #create_account').click(function() {
        showCreateAccount();
    });

    function numberWithSpaces(x) {
        var parts = x.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        return parts.join(".");
    }

    function createAccountTable(data, redoPaging = true) {
        let html = '<tr>' +
            '<th class="col_1"></th>' +
            '<th class="col_2">Balance</th>' +
            '<th class="col_3">Actions</th>' +
            '</tr>';
        let headers = $(html);
        let table = $('table.accounts');
        table.empty();
        table.append(headers);
        console.log(data);
        for (let account of data.result) {
            html = '<tr>' +
                '<td class="col_1">' +
                '<div class="account_short">' +
                '<a href="#">' + account.accountNumber + '</a>' +
                '</div>' +
                '<div class="account_sub">' + account.name +
                '</div>' +
                '</td>' +
                '<td class="col_2">' + config.currency + ' ' + numberWithSpaces(account.money) + '</td>' +
                '<td class="col_3">' +
                '<div class="action">' +
                '<a href="#" class="withdraw_link">Withdraw</a>' +
                '</div>' +
                '<div class="action">' +
                '<a href="#" class="deposit_link">Deposit</a>' +
                '</div>' +
                '<div class="action">' +
                '<a href="#" class="transfer_link">Transfer</a>' +
                '</div>' +
                '</td>' +
                '</tr>';
            let row = $(html);
            //TODO actions
            table.append(row);
        }

        $('.paging').empty();
        if (data.totalCount > config.limit && redoPaging) {
            let pages = Math.floor(data.totalCount / config.limit) + 1;
            for (let page = 1; page <= pages; page++) {
                html = '<a href="#" class="selected">' + page + '</a>';
                if (page != pages)
                    html += '<span class="green">|</span>';
                let pageElm = $(html);
                $('.account_list .paging').append(pageElm);
            }
        }
    }

    function showAccountList() {
        $.post('https://mrp_banking/get_all_accounts', JSON.stringify({
            type: $('.top_sub .account_list .account_types a.selected').attr('id')
        }), (data) => {
            if (!data || data.totalCount == 0) {
                let html = '<tr>' +
                    '<th class="col_1"></th>' +
                    '<th class="col_2">Balance</th>' +
                    '<th class="col_3">Actions</th>' +
                    '</tr>' +
                    '<tr>' +
                    '<td class="col_1">No accounts yet</td>' +
                    '<td class="col_2"></td>' +
                    '<td class="col_3"></td>' +
                    '</tr>';

                $('table.accounts').html(html);
            } else {
                createAccountTable(data);
            }

            $('.account_list').show();
            $('.create_account').hide();
            $('.account_detail').hide();
            $('.deposit').hide();
            $('.withdraw').hide();
            $('.transfer').hide();
        });
    }

    $('.account_list_show').click(function() {
        showAccountList();
    });

    function showAccountDetails() {
        $('.account_list').hide();
        $('.deposit').hide();
        $('.create_account').hide();
        $('.account_detail').show();
        $('.withdraw').hide();
        $('.transfer').hide();
    }

    $('.account_short a').click(function() {
        showAccountDetails();
    });

    function showDeposit() {
        $('.account_list').hide();
        $('.withdraw').hide();
        $('.deposit').show();
        $('.create_account').hide();
        $('.account_detail').hide();
        $('.transfer').hide();
    }

    $('a.deposit_link').click(function() {
        showDeposit();
    });

    function showWithdraw() {
        $('.account_list').hide();
        $('.withdraw').show();
        $('.deposit').hide();
        $('.create_account').hide();
        $('.account_detail').hide();
        $('.transfer').hide();
    }

    $('a.withdraw_link').click(function() {
        showWithdraw();
    });

    function showTransfer() {
        $('.account_list').hide();
        $('.withdraw').hide();
        $('.deposit').hide();
        $('.create_account').hide();
        $('.account_detail').hide();
        $('.transfer').show();
    }

    $('a.transfer_link').click(function() {
        showTransfer();
    });

    function exitBanking() {
        $('.account_list').show();
        $('.withdraw').hide();
        $('.deposit').hide();
        $('.create_account').hide();
        $('.account_detail').hide();
        $('.transfer').hide();
        $('body').hide();
        $.post('https://mrp_banking/close', JSON.stringify({}));
    }

    $('a.exit').click(function() {
        exitBanking();
    });

    $('.account_detail').hide();
    $('.create_account').hide();
    $('.deposit').hide();
    $('.withdraw').hide();
    $('.transfer').hide();

    function formToJson(arr) {
        let json = {};
        for (let item of arr) {
            json[item.name] = item.value;
        }
        return json;
    }

    $("#create_account_form").validate({
        submitHandler: function(form) {
            let values = formToJson($(form).serializeArray());
            let accountType = $('.create_account .account_types .selected').attr('id');
            values.type = accountType;
            $.post('https://mrp_banking/create_account', JSON.stringify(values), (data) => {
                if (data.insertedCount == 1) {
                    $(form).find("input[type=text], textarea").val("");
                    showAccountList();
                } else {
                    $('.create_account .error').html("Error creating account! Try again!");
                }
            });
        }
    });

    window.addEventListener('message', function(event) {
        var data = event.data;
        switch (data.type) {
            case "show":
                $('body').show();
                showAccountList();
                break;
            case "close":
                $('body').hide();
                break;
            default:
                break;
        }
    });
});