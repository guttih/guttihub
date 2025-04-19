#!/usr/bin/env bash

echo "🔧 Installing tools..."
# Declare an array of packages to install

declare -a packages=(
    "nodejs"
    "npm"
    "at"
    "jq"
    "ssh"
    "ffmpeg"
)

#Function: printRequiredPackages()
#
#Brief: Prints the required packages to the terminal.
#
#   $1 (array): A nameref to an array containing the list of packages to install.
#
#Usage:
#   Define an array of package names and pass it to the function by reference.
#   Example:
#     packages=("nodejs" "npm" "jq")
#     printRequiredPackages packages
#
#Returns:
#   0 on success, 1 on failure.
# printRequiredPackages(){
printRequiredPackages(){
    [ $# -ne 1 ] && echo "❌ Invalid number of parameters provided to $FUNCNAME" &&  exit 1

    echo "----------------------------------------"
    
    for package in "${packages[@]}"; do
        echo "  - $package"
    done

    echo "----------------------------------------"
    
}

# Function: install_tools()
#
# Brief: Installs all specified packages using the system's package manager.
#
# Arguments:
#   $1 (array): A nameref to an array containing the list of packages to install.
#
# Usage:
#   Define an array of package names and pass it to the function by reference.
#   Example:
#     packages=("nodejs" "npm" "jq")
#     install_tools packages
#
# Returns:
#   0 on success, 1 on failure.
install_tools(){

    [ $# -ne 1 ] && echo "❌ Invalid number of parameters provided to $FUNCNAME" &&  exit 1

    local package_manager=""
    if command -v apt-get &> /dev/null; then
        package_manager="apt-get"
    elif command -v dnf &> /dev/null; then
        package_manager="dnf"
    else
        echo "❌ No supported package manager found (apt-get or dnf)."
        exit 1
    fi

    local install_command="sudo $package_manager install -y"
    local package_list=""

    for package in "${packages[@]}"; do
        package_list+="$package "
    done

    # Execute the install command
    echo "Executing: $install_command $package_list"
    $install_command "$package_list"
}


    echo "The following packages are required to be installed:"
    printRequiredPackages packages


    echo "Making sure the following packages are installed"
    install_tools packages