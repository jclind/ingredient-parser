"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spoonacularHttp = exports.mongoHttp = void 0;
const axios_1 = require("axios");
exports.mongoHttp = axios_1.default.create({
    baseURL: 'https://us-east-1.aws.data.mongodb-api.com/app/prepify-ixumn/endpoint',
    headers: {
        'Content-type': 'application/json',
    },
});
exports.spoonacularHttp = axios_1.default.create({
    baseURL: 'https://api.spoonacular.com/food/ingredients/',
    headers: {
        'Content-type': 'application/json',
    },
});
