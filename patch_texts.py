with open('templates/index.html', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Login screen
c = c.replace('>URGUT TUMAN AKM<', '>Urgut tuman AKM<')
c = c.replace('Axborot-kutubxona markazi & AI platformasi', 'Urgut tuman axborot-kutubxona markazi')

# 2. Sidebar top
c = c.replace('>URGUT AKM<', '>Urgut tuman AKM<')
c = c.replace('>Axborot-kutubxona markazi<', '>Urgut tuman axborot-kutubxona markazi<')

# 3. ID Card
c = c.replace('SAMARQAND VILOYATI URGUT TUMANI', 'Samarqand viloyati Urgut tumani')
c = c.replace('AXBOROT-KUTUBXONA MARKAZI', 'Axborot-kutubxona markazi')
c = c.replace('A\\'ZOLIK KARTASI', 'A\\'zolik kartasi')

with open('templates/index.html', 'w', encoding='utf-8') as f:
    f.write(c)

print('Success')
