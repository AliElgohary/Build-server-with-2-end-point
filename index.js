import fetch from "node-fetch";
import http from "http";
import url from "url";
import path from "path";
import Joi from "joi";

const server = http.createServer((request, response) => {
  const { query, pathname } = url.parse(request.url, true);
  
  // GET request
  if (pathname == "/products" && request.method === "GET") {
    const products = async () => {
      try {
        const [productRes, rateRes] = await Promise.all([
          fetch("https://api.escuelajs.co/api/v1/products?offset=1&limit=10"),
          fetch(`https://api.exchangerate.host/convert?from=USD&to=${query.CUR}`),
        ]);

        if (!productRes.ok || !rateRes.ok) {
          throw new Error("Unable to fetch data from API");
        }

        const productsData = await productRes.json();
        const exchangeRateData = await rateRes.json();

        const conversionRate = exchangeRateData.result;

        const transformedProducts = productsData.reduce((acc, product) => {
          if (!acc[product.category?.id]) {
            acc[product.category?.id] = {
              category: {
                id: product.category?.id,
                name: product.category?.name,
              },
              products: [],
            };
          }

          const transformedProduct = {
            ...product,
            price: product.price * conversionRate,
          };
          acc[product.category?.id].products.push(transformedProduct);

          return acc;
        }, {});

        response.end(JSON.stringify(Object.values(transformedProducts), null, 2));
      } catch (error) {
        console.log(error);
      }
    };

    products();
  }
  
  // POST request
  if (pathname == "/products" && request.method === "POST") {
    const chunks = [];

    request.on("data", (chunk) => {
      chunks.push(chunk);
    });

    request.on("end", () => {
      try {
        const schema = Joi.object({
          name: Joi.string().required(),
          category: Joi.string().required(),
          price: Joi.number().required(),
        });

        const product = JSON.parse(chunks.toString());
        const validatedProduct = schema.validateSync(product, { strict: true });

        response.setHeader("Content-Type", "application/json");
        response.writeHead(201);
        response.write(JSON.stringify(validatedProduct));
        response.end();
      } catch (error) {
        response.writeHead(400);
        response.end();
      }
    });

    request.on("error", (error) => {
      response.setHeader("Content-Type", "text");
      response.writeHead(500);
      response.write(error.message);
      response.end();
    });
  }

  if (pathname != "/products") {
    response.end("Error!");
  }
});

server.listen(5500, () => {
  console.log("Listenning on port 5500 ...");
});