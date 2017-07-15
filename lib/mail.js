'use strict';

const config = require('./config');
const nodemailer = require('nodemailer');

class Mail {
    constructor(options) {
        this.mailer = nodemailer;
        this.settings = config.mail;
        this.options = options;
    }

    send() {
        if(this.mailer && this.options) {
            let self = this;
            let transporter = self.mailer.createTransport(self.settings);

            if(transporter !== null) {
                return new Promise((resolve, reject) =>{
                    transporter.sendMail(self.options, (error, info) =>{
                        if(error) {
                            reject(Error('Failed'));
                        } else {
                            resolve('OK');
                        }
                    });
                });
            }
        }
    }
}

module.exports = Mail;