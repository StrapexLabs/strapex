FROM node:lts-slim

RUN npm install -g pnpm

RUN mkdir -p /home/strapex/apps/www

WORKDIR /home/strapex/apps/www
COPY package.json .
WORKDIR /home/strapex
COPY --from=root packages /home/strapex/packages
COPY --from=root package.json pnpm-lock.yaml pnpm-workspace.yaml /home/strapex/

RUN pnpm install

WORKDIR /home/strapex/apps/www
COPY . .

EXPOSE 3333

CMD ["pnpm", "dev"]
