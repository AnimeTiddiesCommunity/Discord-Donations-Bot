require('dotenv').config();
const fs = require('fs'), path = require('path'),
web3 = new (require('web3'))("https://bsc-dataseed1.binance.org:443"),
axios = require('axios').default,
donations_wallet = "0x6B9Ae9D732d86cC9617E371a69fb62439d1eEa3c", tokens = {},
holdings_link = 'https://bscscan.com/tokenholdings?a=0x6B9Ae9D732d86cC9617E371a69fb62439d1eEa3c',
transactions_link = "https://bscscan.com/address/0x6B9Ae9D732d86cC9617E371a69fb62439d1eEa3c",
donations_channel = {
    instance: null,
    id : "842757292851593226"
},
Discord = require('discord.js'),
discord_bot = new Discord.Client();

var donations_wallet_message = null;

fs.readdirSync('contracts',{withFileTypes:true}).forEach((file) => {
    let json = JSON.parse(fs.readFileSync(path.join(__dirname,'contracts',file.name)).toString());
    tokens[file.name.split('.')[0]] = new web3.eth.Contract(json.abi, json.address);
});

discord_bot.login(process.env.DISCORD_BOT_TOKEN);

discord_bot.on('ready', async () => {
    donations_channel.instance = await discord_bot.channels.fetch(donations_channel.id);
    setWalletBalanceMessage();
    setInterval(setWalletBalanceMessage, process.env.UPDATE_WALLET_BALANCE_INTERVAL * 1000);
});

async function setWalletBalanceMessage(){
    let wallet_balance = await get_wallet_balance();
    if(donations_wallet_message == null){
        donations_wallet_message = await donations_channel.instance.send(wallet_balance);
    }
    else{
        donations_wallet_message.edit(wallet_balance);
    }
}

function get_coins(){
    return new Promise(resolve => {
        axios.get('http://localhost:8001/coins').then((response) => {
            resolve(response.data);
        })
    })
}

function get_coin_price(coins, amount, symbol){
    let value = 0;
    for(let i = 0, n = coins.length; i < n; i++){
        if(coins[i].symbol == symbol){
            value = amount * parseFloat(coins[i].price);
            break;
        }
    }
    return value.toFixed(2);
}

async function get_wallet_balance(){
    return new Promise(async (resolve) => {
        let coins = await get_coins();
        let bnb = await web3.eth.getBalance(donations_wallet);
        let usdt = await tokens['USDT'].methods.balanceOf(donations_wallet).call();
        let busd = await tokens['BUSD'].methods.balanceOf(donations_wallet).call();
        bnb = (bnb / (10 ** 18)).toFixed(2);
        usdt = (usdt / (10 ** 18)).toFixed(2);
        busd = (busd / (10 ** 18)).toFixed(2);
        let bnb_value = get_coin_price(coins, bnb, "BNB")
        let usdt_value = get_coin_price(coins, usdt, "USDT")
        let busd_value = get_coin_price(coins, busd, "BUSD")
        let total = (parseFloat(bnb_value) + parseFloat(usdt_value) + parseFloat(busd_value)).toFixed(2)
        resolve(`Donations Wallet\n=======================\nBNB\t${bnb}\t$${bnb_value}\nUSDT\t${usdt}\t$${usdt_value}\nBUSD\t${busd}\t$${busd_value}\n=======================\nTOTAL:\t\t$${total}\n\nTransactions: ${transactions_link}\nHoldings: ${holdings_link}`);
    });
}