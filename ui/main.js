$(document).ready(() => {
    let config = {
        skip: 0,
        limit: 4,
        currency: '$',
        dateFormat: 'dd/MM/yyyy HH:mm'
    };

    let character;

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

    /*$('.paging a').click(function() {
        $('.paging a.selected').removeClass('selected');
        $(this).toggleClass('selected');
    });*/

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
        let table = $('.account_list table.accounts');
        table.empty();
        table.append(headers);
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

            row.find('.account_short a').click(() => {
                currentSkip = 0;
                showAccountDetails(account);
            });

            row.find('.withdraw_link').click(() => {
                showWithdraw(account);
            });

            row.find('.deposit_link').click(() => {
                showDeposit(account);
            });

            row.find('.transfer_link').click(() => {
                showTransfer(account);
            });

            table.append(row);
        }

        //$('.paging').empty();
        /*if (data.totalCount > config.limit && redoPaging) {
            let pages = Math.floor(data.totalCount / config.limit) + 1;
            for (let page = 1; page <= pages; page++) {
                html = '<a href="#" class="selected">' + page + '</a>';
                if (page != pages)
                    html += '<span class="green">|</span>';
                let pageElm = $(html);
                $('.account_list .paging').append(pageElm);
            }
        }*/
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

                $('.account_list table.accounts').html(html);
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

    let currentSkip = 0;
    let currentAccount;

    $('.account_detail .paging .back').click(() => {
        if (currentSkip > 0)
            currentSkip = currentSkip - config.limit;
        else
            currentSkip = 0;
        showAccountDetails(currentAccount);
    });

    $('.account_detail .paging .forward').click(() => {
        currentSkip = currentSkip + config.limit;
        showAccountDetails(currentAccount);
    });

    function createTransactionTable(data) {
        let html = '<tr>' +
            '<th class="col_1"></th>' +
            '<th class="col_2">Type</th>' +
            '<th class="col_3">Author</th>' +
            '<th class="col_4">Date</th>' +
            '</tr>';
        let headers = $(html);
        let table = $('.account_detail table.accounts');
        table.empty();
        table.append(headers);
        for (let doc of data) {
            html = '<tr>' +
                '<td class="col_1">';

            if (doc.type != "transfer") {
                html += '<span class="' + (doc.sum > 0 ? 'increase' : 'decrease') + '">' + config.currency + ' ' + numberWithSpaces(Math.abs(doc.sum)) + '</span>';
            } else {
                html += '<div><span class="' + (doc.sum > 0 ? 'increase' : 'decrease') + '">' + config.currency + ' ' + numberWithSpaces(Math.abs(doc.sum)) + '</span></div>';
                html += '<div class="account_sub">' + doc.fromAccount[0].name + ' => ' + doc.toAccount[0].name + ' (' + doc.note + ')</div>';
            }

            let date = new Date(doc.timestamp);
            let formatedDate = $.format.date(date, config.dateFormat);

            html += '</td>' +
                '<td class="col_2">' + doc.type + '</td>' +
                '<td class="col_3">' + doc.authorChar[0].name + ' ' + doc.authorChar[0].surname + '</td>' +
                '<td class="col_4">' + formatedDate + '</td>' +
                '</tr>';
            let row = $(html);
            table.append(row);
        }
    }

    function showAccountDetails(account) {
        currentAccount = account;
        updateUniversalHeader(account, $('.top_sub .account_detail'));

        $.post('https://mrp_banking/get_all_transactions', JSON.stringify({
            account: account._id,
            skip: currentSkip,
            limit: config.limit
        }), (result) => {
            $('.account_detail .paging').hide();
            if (result && result.length == 1) {
                result = result[0];
                let count = result.docCount[0].count;
                if (count > config.limit) {
                    //need paging
                    $('.account_detail .paging').show();
                }

                let documents = result.data;
                createTransactionTable(documents);
            }
        });

        $('.bottom_container .account_detail a').unbind('click');

        $('.bottom_container .account_detail a.transfer_link').click(() => {
            showTransfer(account);
        });

        $('.bottom_container .account_detail a.withdraw_link').click(() => {
            showWithdraw(account);
        });

        $('.bottom_container .account_detail a.deposit_link').click(() => {
            showDeposit(account);
        });

        $('.bottom_container .account_detail a.account_list_show').click(() => {
            showAccountList();
        });

        $('.bottom_container .account_detail a.exit').click(() => {
            exitBanking();
        });

        $('.account_list').hide();
        $('.deposit').hide();
        $('.create_account').hide();
        $('.account_detail').show();
        $('.withdraw').hide();
        $('.transfer').hide();
    }

    /*$('.account_short a').click(function() {
        showAccountDetails();
    });*/

    function updateUniversalHeader(account, elm) {
        let html = account.accountNumber +
            '<div class="account_types">' +
            '<span class="account_name">' + account.name + '</span>' +
            '</div>';
        elm.html(html);
    }

    function showDeposit(account) {
        updateUniversalHeader(account, $('.top_sub .deposit'));

        $('.deposit .balance').html(config.currency + ' ' + numberWithSpaces(account.money));
        $('.deposit .cash').html(config.currency + ' ' + numberWithSpaces(character.stats.cash));

        $("#deposit_form").validate({
            rules: {
                deposit_amount: {
                    required: true,
                    range: [0, character.stats.cash]
                }
            },
            submitHandler: function(form) {
                let values = formToJson($(form).serializeArray());
                values.account = account;
                $.post('https://mrp_banking/deposit', JSON.stringify(values), (data) => {
                    if (data.modifiedCount > 0) {
                        character.stats.cash -= parseInt(values.deposit_amount);
                        showAccountList();
                    } else {
                        console.log("Failed to deposit money");
                    }
                });
            }
        });

        $('.account_list').hide();
        $('.withdraw').hide();
        $('.deposit').show();
        $('.create_account').hide();
        $('.account_detail').hide();
        $('.transfer').hide();
    }

    /*$('a.deposit_link').click(function() {
        showDeposit();
    });*/

    function showWithdraw(account) {
        updateUniversalHeader(account, $('.top_sub .withdraw'));

        $('.withdraw .balance').html(config.currency + ' ' + numberWithSpaces(account.money));
        $('.withdraw .cash').html(config.currency + ' ' + numberWithSpaces(character.stats.cash));

        $("#withdraw_form").validate({
            rules: {
                withdraw_amount: {
                    required: true,
                    range: [0, account.money]
                }
            },
            submitHandler: function(form) {
                let values = formToJson($(form).serializeArray());
                values.account = account;
                $.post('https://mrp_banking/withdraw', JSON.stringify(values), (data) => {
                    if (data.modifiedCount > 0) {
                        character.stats.cash += parseInt(values.withdraw_amount);
                        showAccountList();
                    } else {
                        console.log("Failed to withdraw money");
                    }
                });
            }
        });

        $('.account_list').hide();
        $('.withdraw').show();
        $('.deposit').hide();
        $('.create_account').hide();
        $('.account_detail').hide();
        $('.transfer').hide();
    }

    /*$('a.withdraw_link').click(function() {
        showWithdraw();
    });*/

    function showTransfer(account) {
        updateUniversalHeader(account, $('.top_sub .transfer'));

        $('.transfer .balance').html(config.currency + ' ' + numberWithSpaces(account.money));

        $("#transfer_form").validate({
            rules: {
                transfer_amount: {
                    required: true,
                    range: [0, account.money]
                },
                transfer_account: {
                    required: true
                }
            },
            submitHandler: function(form) {
                let values = formToJson($(form).serializeArray());
                values.account = account;
                $.post('https://mrp_banking/transfer', JSON.stringify(values), (data) => {
                    if (data.modifiedCount > 0) {
                        showAccountList();
                    } else {
                        //todo show error
                        console.log("Failed to transfer money");
                    }
                });
            }
        });

        $('.account_list').hide();
        $('.withdraw').hide();
        $('.deposit').hide();
        $('.create_account').hide();
        $('.account_detail').hide();
        $('.transfer').show();
    }

    /*$('a.transfer_link').click(function() {
        showTransfer();
    });*/

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
                character = data.character;
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