FROM rust:latest

ENV HOME="/home"

# install asdf
ENV ASDF_VERSION="0.16.7"
ENV ASDF_DATA_DIR="$HOME/.asdf"
ENV ASDF_SHIMS="$ASDF_DATA_DIR/shims"
ENV LOCAL_BIN="$HOME/.local/bin"

RUN mkdir -p $LOCAL_BIN
RUN curl -sSL --fail "https://github.com/asdf-vm/asdf/releases/download/v$ASDF_VERSION/asdf-v$ASDF_VERSION-linux-amd64.tar.gz" | tar xzf - -C $LOCAL_BIN

ENV PATH="$LOCAL_BIN:$PATH"
ENV PATH="$ASDF_SHIMS:$PATH"

# install tools via asdf
WORKDIR $HOME/contracts
COPY .tool-versions .

RUN while read -r line; do\
    tool="$(echo $line | cut -d " " -f 1)";\
    asdf plugin add ${tool};\
    version="$(echo $line | cut -d " " -f 2)";\
    asdf install ${tool} ${version};\
  done < ".tool-versions"

# copy contracts sources
COPY . .

# build contracts
RUN scarb build

# run contract deployment script
RUN chmod +x deploy.sh
ENTRYPOINT ["./deploy.sh"]
