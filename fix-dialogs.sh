#!/bin/bash

# Script para identificar e corrigir todos os Dialogs sem DialogTitle/DialogDescription

echo "Verificando todos os arquivos com DialogContent..."

# Procurar por DialogContent sem DialogTitle na mesma estrutura
find client/src -name "*.tsx" -exec grep -l "DialogContent" {} \; | while read file; do
    echo "Verificando: $file"
    
    # Verificar se há DialogContent sem DialogHeader adequado
    if grep -q "DialogContent" "$file" && ! grep -A 10 "DialogContent" "$file" | grep -q "DialogTitle"; then
        echo "PROBLEMA: $file tem DialogContent sem DialogTitle"
    fi
done