import pandas as pd
from scipy.io import arff

# path to arff data file
input_file = "/Users/andrejartuschenko/Desktop/Mailharpoonv2/backend/data/Training_Dataset_phishing_websites.arff"

# ARFF-Datei laden
data, meta = arff.loadarff(input_file)

# In Pandas DataFrame umwandeln
df = pd.DataFrame(data)

# Byte-Strings in normale Strings konvertieren (wichtig bei nominalen Attributen)
for column in df.select_dtypes([object]):
    df[column] = df[column].str.decode("utf-8")

# Als CSV speichern
output_file = "UCI_training_dataset.csv"
df.to_csv(output_file, index=False)

print("Umwandlung erfolgreich abgeschlossen!")
