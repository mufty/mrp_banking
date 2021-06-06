$(document).ready(() => {
    $('.main_container').hide();

    $('.account_types a').click(function() {
        $('.account_types a.selected').removeClass('selected');
        $(this).toggleClass('selected');
    });

    $('.paging a').click(function() {
        $('.paging a.selected').removeClass('selected');
        $(this).toggleClass('selected');
    });

    $('.account_list #create_account').click(function() {
        $('.account_list').hide();
        $('.account_detail').hide();
        $('.deposit').hide();
        $('.withdraw').hide();
        $('.transfer').hide();
        $('.create_account').show();
    });

    $('.account_list_show').click(function() {
        $('.account_list').show();
        $('.create_account').hide();
        $('.account_detail').hide();
        $('.deposit').hide();
        $('.withdraw').hide();
        $('.transfer').hide();
    });

    $('.account_short a').click(function() {
        $('.account_list').hide();
        $('.deposit').hide();
        $('.create_account').hide();
        $('.account_detail').show();
        $('.withdraw').hide();
        $('.transfer').hide();
    });

    $('a.deposit_link').click(function() {
        $('.account_list').hide();
        $('.withdraw').hide();
        $('.deposit').show();
        $('.create_account').hide();
        $('.account_detail').hide();
        $('.transfer').hide();
    });

    $('a.withdraw_link').click(function() {
        $('.account_list').hide();
        $('.withdraw').show();
        $('.deposit').hide();
        $('.create_account').hide();
        $('.account_detail').hide();
        $('.transfer').hide();
    });

    $('a.transfer_link').click(function() {
        $('.account_list').hide();
        $('.withdraw').hide();
        $('.deposit').hide();
        $('.create_account').hide();
        $('.account_detail').hide();
        $('.transfer').show();
    });

    $('.account_detail').hide();
    $('.create_account').hide();
    $('.deposit').hide();
    $('.withdraw').hide();
    $('.transfer').hide();

    window.addEventListener('message', function(event) {
        var data = event.data;
        switch (data.type) {
            case "show":
                $('.main_container').show();
            default:
                break;
        }
    });
});