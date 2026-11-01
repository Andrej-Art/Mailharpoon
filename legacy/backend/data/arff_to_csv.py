import pandas as pd
from scipy.io import arff

# path to arff data file
input_file = "/Users/andrejartuschenko/Desktop/Mailharpoonv2/backend/data/Training_Dataset_phishing_websites.arff"

# load arff
data, meta = arff.loadarff(input_file)

# convert to pandas dataframe
df = pd.DataFrame(data)

# convert byte strings to strings 
for column in df.select_dtypes([object]):
    df[column] = df[column].str.decode("utf-8")

# save to csv
output_file = "UCI_training_dataset.csv"
df.to_csv(output_file, index=False)

print("Umwandlung erfolgreich abgeschlossen!")
