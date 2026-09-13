import pandas as pd

df_members = pd.DataFrame({
    'Sigla raqam': ['KB-000001', 'KB-000002'],
    'F.I.Sh': ['Abdullayev Jasur', 'Karimova Malika'],
    'Jinsi': ['Erkak', 'Ayol'],
    'Tugilgan sana': ['15.05.1995', '22.08.1998'],
    'Yosh': ['29', '26'],
    'Telefon': ['+998901234567', '+998971112233'],
    'Yangi azo bolgan': ['01.01.2024', '15.02.2024']
})
df_members.to_excel('static/samples/azolarni_import_namuna.xlsx', index=False)

df_books = pd.DataFrame({
    'Kitob nomi': ['O\'tkan kunlar', 'Sariq devni minib'],
    'Muallifi': ['Abdulla Qodiriy', 'Xudoyberdi To\'xtaboyev'],
    'Nashr yili': ['2020', '2019'],
    'Inventar raqami': ['INV-00100', 'INV-00101'],
    'Saqlash joyi': ['Asosiy fond', 'Bolalar bo\'limi']
})
df_books.to_excel('static/samples/kitoblarni_import_namuna.xlsx', index=False)
